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
  isMock: boolean;
  figma: FigmaApiPayload | null;
  figmaSkippedReason?: string;
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
      isMock: Boolean(result.mock),
      figma: result.figma,
      figmaSkippedReason: result.figmaSkippedReason,
    };
  }, [result]);
}
