import type { Finding, Severity } from "@/lib/types";

const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 18,
  high: 12,
  medium: 6,
  low: 3,
};

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Deterministic score from findings — agent explains, never decides. */
export function computeReadinessScore(findings: Finding[]): number {
  const penalty = findings.reduce(
    (sum, f) => sum + SEVERITY_PENALTY[f.severity],
    0,
  );
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function sortFindingsBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
}
