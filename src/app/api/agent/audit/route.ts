import { NextResponse } from "next/server";

import { parseContrastLevel } from "@/lib/audit/contrast-level";
import { parseLayoutHandoffProfile } from "@/lib/audit/layout-profile";
import { runAllAudits } from "@/lib/audit/run-audits";
import { getRootNodesFromCache } from "@/lib/figma/cache";
import { countFigmaNodes } from "@/lib/figma/tree";
import {
  computeReadinessScore,
  sortFindingsBySeverity,
} from "@/lib/readiness-score";
import type { AgentAuditResponse, AgentErrorResponse } from "@/lib/types";
import {
  DEFAULT_EXPORT_QUALITY,
  EXPORT_QUALITY_VALUES,
  type ExportQuality,
} from "@/lib/types";

/**
 * POST /api/agent/audit
 *
 * Wizard Step 2 — Structural Linters. Reads the cached Figma tree
 * (primed by /api/agent/init), runs all 8 deterministic audits,
 * computes the readiness score, and returns findings sorted by severity.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const record = body as Record<string, unknown>;

  const fileKey =
    typeof record.fileKey === "string" ? record.fileKey.trim() : "";

  if (!fileKey) {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Missing fileKey" },
      { status: 400 },
    );
  }

  const roots = await getRootNodesFromCache(fileKey);
  if (!roots) {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Cache miss — run /api/agent/init first" },
      { status: 400 },
    );
  }

  const layoutHandoffProfile = parseLayoutHandoffProfile(
    record.layoutHandoffProfile,
  );

  const contrastLevel = parseContrastLevel(record.contrastLevel);

  const rawGridBase =
    typeof record.gridBase === "number" ? record.gridBase : undefined;
  const gridBase =
    rawGridBase !== undefined && rawGridBase >= 1 && rawGridBase <= 5
      ? rawGridBase
      : undefined;

  const rawExportQuality =
    typeof record.exportQuality === "number" ? record.exportQuality : undefined;
  const exportQuality: ExportQuality =
    rawExportQuality !== undefined &&
    EXPORT_QUALITY_VALUES.includes(rawExportQuality as ExportQuality)
      ? (rawExportQuality as ExportQuality)
      : DEFAULT_EXPORT_QUALITY;

  const findings = sortFindingsBySeverity(
    runAllAudits(roots, {
      fileKey,
      layoutHandoffProfile,
      gridBase,
      contrastLevel,
      minRasterScale: exportQuality,
    }),
  );

  const readinessScore = computeReadinessScore(findings);
  const nodesScanned = countFigmaNodes(roots);

  return NextResponse.json<AgentAuditResponse>({
    readinessScore,
    findings,
    nodesScanned,
    layoutHandoffProfile,
  });
}
