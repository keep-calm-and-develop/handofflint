import { NextResponse } from "next/server";

import { parseFigmaUrl } from "@/lib/figma/url";
import { getMockFindings } from "@/lib/mock-findings";
import {
  computeReadinessScore,
  sortFindingsBySeverity,
} from "@/lib/readiness-score";
import type { ScanErrorResponse, ScanResponse } from "@/lib/types";

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

  const findings = sortFindingsBySeverity(getMockFindings(parsed.fileKey));
  const readinessScore = computeReadinessScore(findings);

  return NextResponse.json<ScanResponse>({
    readinessScore,
    findings,
    fileKey: parsed.fileKey,
    nodeId: parsed.nodeId,
    scannedAt: new Date().toISOString(),
    mock: true,
  });
}
