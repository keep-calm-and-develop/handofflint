import type { ExpectedFinding } from "@/lib/evals/types";
import type { AIEnrichmentItem } from "@/lib/types";

export interface FindingMatchResult {
  expected: ExpectedFinding;
  matched: boolean;
}

export interface RunAssertionResult {
  matched: FindingMatchResult[];
  missed: ExpectedFinding[];
  extras: AIEnrichmentItem[];
  pass: boolean;
}

function findingMatches(
  verified: AIEnrichmentItem[],
  expected: ExpectedFinding,
): boolean {
  return verified.some((item) => {
    if (item.nodeId !== expected.nodeId) return false;
    if (item.violationCategory !== expected.violationCategory) return false;
    if (expected.descriptionIncludes) {
      const haystack = item.perceptualFlawDescription.toLowerCase();
      const needle = expected.descriptionIncludes.toLowerCase();
      return haystack.includes(needle);
    }
    return true;
  });
}

export function assertRunAgainstExpected(
  verified: AIEnrichmentItem[],
  expected: ExpectedFinding[],
): RunAssertionResult {
  const matchedResults: FindingMatchResult[] = expected.map((item) => ({
    expected: item,
    matched: findingMatches(verified, item),
  }));

  const missed = matchedResults
    .filter((result) => !result.matched)
    .map((result) => result.expected);

  const extras = verified.filter(
    (item) =>
      !expected.some(
        (target) =>
          target.nodeId === item.nodeId &&
          target.violationCategory === item.violationCategory,
      ),
  );

  return {
    matched: matchedResults,
    missed,
    extras,
    pass: missed.length === 0,
  };
}

export function computePassRate(
  runs: Array<{ pass: boolean }>,
): number | null {
  if (runs.length === 0) return null;
  const passes = runs.filter((run) => run.pass).length;
  return Math.round((passes / runs.length) * 100);
}
