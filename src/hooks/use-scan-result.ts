"use client";

import { useMemo } from "react";

import {
  formatFindingCount,
  getScoreColorClass,
} from "@/lib/scan-display";
import type { FigmaApiPayload, Finding, ScanResponse } from "@/lib/types";

export interface ScanResultViewModel {
  readinessScore: number;
  scoreColorClass: string;
  findingCountLabel: string;
  findings: Finding[];
  hasFindings: boolean;
  auditsSkipped: boolean;
  auditStatusLabel: string | null;
  figma: FigmaApiPayload | null;
  figmaSkippedReason?: string;
}

function buildAuditStatusLabel(result: ScanResponse): string | null {
  if (result.figma === null) {
    return null;
  }

  const { auditSummary } = result;
  if (!auditSummary || auditSummary.nodesScanned === 0) {
    return "Figma tree could not be parsed — no audits ran.";
  }

  const tools = auditSummary.toolsRun.join(", ");
  const issueWord = result.findings.length === 1 ? "issue" : "issues";
  const sourceLabel =
    auditSummary.dataSource === "cache"
      ? "Figma API (cached)"
      : "Figma API";
  return `Scanned ${auditSummary.nodesScanned} layers · ${sourceLabel} · ${tools} audit · ${result.findings.length} naming ${issueWord}`;
}

export function useScanResult(
  result: ScanResponse | null,
): ScanResultViewModel | null {
  return useMemo(() => {
    if (!result) return null;

    return {
      readinessScore: result.readinessScore,
      scoreColorClass: getScoreColorClass(result.readinessScore),
      findingCountLabel: formatFindingCount(result.findings.length),
      findings: result.findings,
      hasFindings: result.findings.length > 0,
      auditsSkipped: result.figma === null,
      auditStatusLabel: buildAuditStatusLabel(result),
      figma: result.figma,
      figmaSkippedReason: result.figmaSkippedReason,
    };
  }, [result]);
}
