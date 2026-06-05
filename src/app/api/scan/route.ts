import { NextResponse } from "next/server";

import { parseContrastLevel } from "@/lib/audit/contrast-level";
import { parseLayoutHandoffProfile } from "@/lib/audit/layout-profile";
import { runAllAudits } from "@/lib/audit/run-audits";
import { FigmaApiError, fetchFigmaTree } from "@/lib/figma/client";
import { isFigmaApiMockEnabled } from "@/lib/figma/mock-enabled";
import {
  countFigmaNodes,
  extractFigmaDocuments,
  walkFigmaTree,
} from "@/lib/figma/tree";
import { parseFigmaUrl } from "@/lib/figma/url";
import {
  computeReadinessScore,
  sortFindingsBySeverity,
} from "@/lib/readiness-score";
import {
  DEFAULT_EXPORT_QUALITY,
  EXPORT_QUALITY_VALUES,
  type ExportQuality,
  type FigmaApiEndpoint,
  type FigmaDataSource,
  type FigmaFetchSummary,
  type ScanErrorResponse,
  type ScanResponse,
  type AIEnrichmentItem,
} from "@/lib/types";
import { executeRenderFrame } from "@/lib/agent/tools/render-frame";
import { analyzeVisualFrame } from "@/lib/agent/vision";
import { verifyGroundedness, crossModalFilter } from "@/lib/agent/guardrails";
import { FigmaNode } from "@/lib/figma/node";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ScanErrorResponse>(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const url =
    typeof body === "object" &&
    body !== null &&
    "url" in body &&
    typeof (body as { url: unknown }).url === "string"
      ? (body as { url: string }).url.trim()
      : "";

  const layoutHandoffProfile = parseLayoutHandoffProfile(
    typeof body === "object" && body !== null && "layoutHandoffProfile" in body
      ? (body as { layoutHandoffProfile: unknown }).layoutHandoffProfile
      : undefined,
  );

  const contrastLevel = parseContrastLevel(
    typeof body === "object" && body !== null && "contrastLevel" in body
      ? (body as { contrastLevel: unknown }).contrastLevel
      : undefined,
  );

  const rawGridBase =
    typeof body === "object" &&
    body !== null &&
    "gridBase" in body &&
    typeof (body as { gridBase: unknown }).gridBase === "number"
      ? (body as { gridBase: number }).gridBase
      : undefined;
  const gridBase =
    rawGridBase !== undefined && rawGridBase >= 1 && rawGridBase <= 5
      ? rawGridBase
      : undefined;

  const rawExportQuality =
    typeof body === "object" &&
    body !== null &&
    "exportQuality" in body &&
    typeof (body as { exportQuality: unknown }).exportQuality === "number"
      ? (body as { exportQuality: number }).exportQuality
      : undefined;
  const exportQuality: ExportQuality =
    rawExportQuality !== undefined &&
    EXPORT_QUALITY_VALUES.includes(rawExportQuality as ExportQuality)
      ? (rawExportQuality as ExportQuality)
      : DEFAULT_EXPORT_QUALITY;

  if (!url) {
    return NextResponse.json<ScanErrorResponse>(
      { error: "Missing Figma URL" },
      { status: 400 },
    );
  }

  const parsed = parseFigmaUrl(url);
  if (!parsed.ok) {
    return NextResponse.json<ScanErrorResponse>(
      { error: parsed.error },
      { status: 400 },
    );
  }

  const endpoint: FigmaApiEndpoint = parsed.nodeId ? "nodes" : "file";
  let figma: ScanResponse["figma"] = null;
  let figmaSkippedReason: string | undefined;

  let dataSource: FigmaDataSource = "api";
  let figmaFetch: FigmaFetchSummary | undefined;

  try {
    const figmaResult = await fetchFigmaTree(parsed.fileKey, parsed.nodeId);

    if (figmaResult !== null) {
      dataSource = figmaResult.source;
      if (figmaResult.cache) {
        figmaFetch = {
          cacheHit: figmaResult.cache.hit,
          treeFetchedAt: figmaResult.cache.fetchedAt,
        };
      }
      figma = {
        endpoint,
        fileKey: parsed.fileKey,
        nodeId: parsed.nodeId,
        data: figmaResult.data,
      };
    } else {
      figmaSkippedReason = "FIGMA_ACCESS_TOKEN is not set";
    }
  } catch (err) {
    if (err instanceof FigmaApiError) {
      return NextResponse.json<ScanErrorResponse>(
        { error: err.message },
        { status: err.status },
      );
    }
    throw err;
  }

  let findings: ScanResponse["findings"] = [];
  let auditSummary: ScanResponse["auditSummary"];
  let finalEnrichments: AIEnrichmentItem[] | null = null;

  if (figma?.data != null) {
    const roots = extractFigmaDocuments(figma.data);
    const nodesScanned = countFigmaNodes(roots);
    findings = sortFindingsBySeverity(
      runAllAudits(roots, {
        fileKey: parsed.fileKey,
        layoutHandoffProfile,
        gridBase,
        contrastLevel,
        minRasterScale: exportQuality,
      }),
    );
    const targetNodeId = parsed.nodeId || (roots[0] ? roots[0].id : null);
    const googleApiKeySet = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (targetNodeId && googleApiKeySet) {
      try {
        const renderResult = await executeRenderFrame(parsed.fileKey, {
          nodeId: targetNodeId,
          scale: 1,
          format: "png",
        });

        if (renderResult.status === "ok") {
          const validNodeIdsInTree = new Set<string>();
          const figmaNodesMap = new Map<string, FigmaNode>();

          for (const root of roots) {
            walkFigmaTree(root, (node) => {
              validNodeIdsInTree.add(node.id);
              figmaNodesMap.set(node.id, node);
            });
          }

          // Build a shallow textual description string of the tree metadata context for Gemini
          const contextSnapshotString = JSON.stringify(
            findings
              .slice(0, 10)
              .map((f) => ({ node: f.nodeName, id: f.nodeId, rule: f.rule })),
          );

          // Invoke your single-turn Gemini vision module wrapper cleanly
          const aiResponse = await analyzeVisualFrame({
            imageUrl: renderResult.url,
            figmaNodeContext: contextSnapshotString,
          });

          if (aiResponse.status === "success" && aiResponse.enrichments) {
            // Apply Guardrail Step 1: Groundedness check (Drop ghost element citations)
            const groundedItems = verifyGroundedness(
              aiResponse.enrichments,
              validNodeIdsInTree,
            );

            // Apply Guardrail Step 2: Cross-modal check (Match assertions against JSON rules)
            finalEnrichments = crossModalFilter(groundedItems, figmaNodesMap);
          }
        }
      } catch (visionError) {
        console.error(
          "[Vision Step Error]: Layer degradation activated.",
          visionError,
        );
      }
    }
    auditSummary = {
      nodesScanned,
      toolsRun: [
        "naming",
        "layout",
        "hidden",
        "spacing",
        "contrast",
        "svg",
        "export",
        "reuse",
      ],
      layoutHandoffProfile,
      dataSource,
      ...(isFigmaApiMockEnabled() ? { figmaMock: true } : {}),
      ...(figmaFetch ? { figmaFetch } : {}),
    };
  }

  const readinessScore = computeReadinessScore(findings);

  return NextResponse.json<ScanResponse>({
    readinessScore,
    findings,
    fileKey: parsed.fileKey,
    nodeId: parsed.nodeId,
    scannedAt: new Date().toISOString(),
    figma,
    figmaSkippedReason,
    auditSummary,
    aiEnrichment: finalEnrichments,
  });
}
