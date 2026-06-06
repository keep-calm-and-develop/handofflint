"use client";

import { useMemo } from "react";

import {
  formatFindingCount,
  getLayoutHandoffLabel,
  getScoreColorClass,
} from "@/lib/scan-display";
import type { AgentAuditResponse, Finding } from "@/lib/types";

export interface AgentAuditResultViewModel {
  readinessScore: number | null;
  scoreColorClass: string;
  findingCountLabel: string;
  findings: Finding[];
  hasFindings: boolean;
  auditStatusLabel: string | null;
  hasAudit: boolean;
}

function buildAuditStatusLabel(result: AgentAuditResponse): string {
  const issueWord = result.findings.length === 1 ? "issue" : "issues";
  const layoutLabel = getLayoutHandoffLabel(result.layoutHandoffProfile);
  return `Scanned ${result.nodesScanned} layers · Figma cache · ${result.findings.length} ${issueWord} · layout: ${layoutLabel}`;
}

export function useAgentAuditResult(
  result: AgentAuditResponse | null,
): AgentAuditResultViewModel {
  return useMemo(() => {
    if (!result) {
      return {
        readinessScore: null,
        scoreColorClass: getScoreColorClass(0),
        findingCountLabel: "No audit run yet",
        findings: [],
        hasFindings: false,
        auditStatusLabel: "Run step 2 to run deterministic audits.",
        hasAudit: false,
      };
    }

    return {
      readinessScore: result.readinessScore,
      scoreColorClass: getScoreColorClass(result.readinessScore),
      findingCountLabel: formatFindingCount(result.findings.length),
      findings: result.findings,
      hasFindings: result.findings.length > 0,
      auditStatusLabel: buildAuditStatusLabel(result),
      hasAudit: true,
    };
  }, [result]);
}
