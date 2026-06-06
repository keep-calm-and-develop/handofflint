import type { AuditTool, Finding, Severity } from "@/lib/types";

/**
 * Scoring knobs — tune here to reflect "buildable but flawed" vs. blocking issues.
 *
 * Penalties apply after category weight and repetition decay (see computeReadinessScore).
 */
export const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 20,
  high: 8,
  medium: 4,
  low: 2,
};

/** How much each audit category affects handoff buildability (0–1). */
export const BUILDABILITY_WEIGHT: Record<AuditTool, number> = {
  layout: 1,
  contrast: 0.75,
  naming: 0.55,
  reuse: 0.6,
  svg: 0.5,
  export: 0.45,
  hidden: 0.4,
  spacing: 0.35,
};

/** Fraction of base penalty for the 1st, 2nd, 3rd… finding in a repetition group. */
export const REPETITION_DECAY = [1, 0.7, 0.5, 0.4, 0.35, 0.3] as const;

/** Max total deduction when no critical findings — keeps a floor for flawed-but-buildable files. */
export const MAX_PENALTY_DEFAULT = 75;

/** Max total deduction when at least one critical finding is present. */
export const MAX_PENALTY_WITH_CRITICAL = 95;

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function repetitionMultiplier(indexInGroup: number): number {
  return (
    REPETITION_DECAY[indexInGroup] ??
    REPETITION_DECAY[REPETITION_DECAY.length - 1]
  );
}

/**
 * Group repeated violations so the score reflects issue breadth, not raw count.
 * Contrast failures on many instances are treated as one systemic pattern.
 */
function repetitionGroupKey(finding: Finding): string {
  if (finding.auditTool === "contrast") {
    return `${finding.auditTool}:${finding.rule}`;
  }
  return `${finding.auditTool}:${finding.rule}:${finding.nodeId}`;
}

function computeRawPenalty(findings: Finding[]): number {
  const groups = new Map<string, Finding[]>();

  for (const finding of findings) {
    const key = repetitionGroupKey(finding);
    const group = groups.get(key) ?? [];
    group.push(finding);
    groups.set(key, group);
  }

  let penalty = 0;

  for (const group of groups.values()) {
    const sorted = [...group].sort(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
    );

    sorted.forEach((finding, index) => {
      const base =
        SEVERITY_PENALTY[finding.severity] *
        BUILDABILITY_WEIGHT[finding.auditTool];
      penalty += base * repetitionMultiplier(index);
    });
  }

  return penalty;
}

/** Deterministic score from findings — agent explains, never decides. */
export function computeReadinessScore(findings: Finding[]): number {
  if (findings.length === 0) {
    return 100;
  }

  const hasCritical = findings.some((finding) => finding.severity === "critical");
  const maxPenalty = hasCritical ? MAX_PENALTY_WITH_CRITICAL : MAX_PENALTY_DEFAULT;
  const penalty = Math.min(computeRawPenalty(findings), maxPenalty);

  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

export function sortFindingsBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
}
