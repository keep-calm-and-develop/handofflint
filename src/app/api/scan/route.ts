import { NextResponse } from "next/server";

import { parseContrastLevel } from "@/lib/audit/contrast-level";
import { parseLayoutHandoffProfile } from "@/lib/audit/layout-profile";
import { runAllAudits } from "@/lib/audit/run-audits";
import { FigmaApiError, fetchFigmaTree } from "@/lib/figma/client";
import { isFigmaApiMockEnabled } from "@/lib/figma/mock-enabled";
import { countFigmaNodes, extractFigmaDocuments } from "@/lib/figma/tree";
import { parseFigmaUrl } from "@/lib/figma/url";
import {
  computeReadinessScore,
  sortFindingsBySeverity,
} from "@/lib/readiness-score";
import type {
  FigmaApiEndpoint,
  FigmaDataSource,
  FigmaFetchSummary,
  ScanErrorResponse,
  ScanResponse,
} from "@/lib/types";

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

  if (figma?.data != null) {
    const roots = extractFigmaDocuments(figma.data);
    const nodesScanned = countFigmaNodes(roots);
    findings = sortFindingsBySeverity(
      runAllAudits(roots, {
        fileKey: parsed.fileKey,
        layoutHandoffProfile,
        gridBase,
        contrastLevel,
      }),
    );
    auditSummary = {
      nodesScanned,
      toolsRun: ["naming", "layout", "hidden", "spacing", "contrast"],
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
  });
}
