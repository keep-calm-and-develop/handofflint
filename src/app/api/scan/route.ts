import { NextResponse } from "next/server";

import { runAllAudits } from "@/lib/audit/run-audits";
import { FigmaApiError, fetchFigmaTree } from "@/lib/figma/client";
import { countFigmaNodes, extractFigmaDocuments } from "@/lib/figma/tree";
import { parseFigmaUrl } from "@/lib/figma/url";
import {
  computeReadinessScore,
  sortFindingsBySeverity,
} from "@/lib/readiness-score";
import type { FigmaApiEndpoint, ScanErrorResponse, ScanResponse } from "@/lib/types";

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

  let dataSource: "api" | "fixture" = "api";

  try {
    const figmaResult = await fetchFigmaTree(parsed.fileKey, parsed.nodeId);

    if (figmaResult !== null) {
      dataSource = figmaResult.source;
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
      runAllAudits(roots, { fileKey: parsed.fileKey }),
    );
    auditSummary = {
      nodesScanned,
      toolsRun: ["naming"],
      dataSource,
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
