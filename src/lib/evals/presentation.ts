import { assertRunAgainstExpected, computePassRate } from "@/lib/evals/assert";
import { EVAL_CASE_ORDER, EVAL_CASES } from "@/lib/evals/cases";
import {
  goldenImageExists,
  listRunRecords,
  loadExpectedFindings,
  loadSuiteManifest,
  readGoldenNodesPreview,
} from "@/lib/evals/golden";
import type {
  EvalCaseSummary,
  EvalPresentationCase,
  EvalPresentationData,
} from "@/lib/evals/types";

function buildCaseSummary(caseId: (typeof EVAL_CASE_ORDER)[number]): EvalCaseSummary | null {
  const manifest = loadSuiteManifest();
  const status = manifest.caseStatus[caseId];
  const runs = listRunRecords(caseId);
  const expected = loadExpectedFindings(caseId);

  if (runs.length === 0 && !status.locked) {
    return {
      caseId,
      runsCompleted: status.runsCompleted,
      runsRequired: manifest.runsPerCase,
      locked: status.locked,
      passRate: null,
      lastCapturedAt: null,
    };
  }

  const assertionRuns = runs.map((run) => ({
    pass: expected.length
      ? assertRunAgainstExpected(run.verifiedEnrichments, expected).pass
      : false,
  }));

  return {
    caseId,
    runsCompleted: status.runsCompleted,
    runsRequired: manifest.runsPerCase,
    locked: status.locked,
    passRate: status.locked ? computePassRate(assertionRuns) : null,
    lastCapturedAt: runs.at(-1)?.capturedAt ?? null,
  };
}

export function buildEvalsPresentationData(): EvalPresentationData {
  const manifest = loadSuiteManifest();

  const cases: EvalPresentationCase[] = EVAL_CASE_ORDER.map((caseId) => {
    const meta = EVAL_CASES[caseId];
    const status = manifest.caseStatus[caseId];
    const runs = listRunRecords(caseId);

    return {
      meta,
      status,
      expected: loadExpectedFindings(caseId),
      summary: buildCaseSummary(caseId),
      recentRuns: runs.slice(-3).map((run) => ({
        runIndex: run.runIndex,
        verifiedCount: run.verifiedEnrichments.length,
        capturedAt: run.capturedAt,
        error: run.error,
      })),
      nodesJsonPreview: readGoldenNodesPreview(caseId),
      hasImage: goldenImageExists(caseId),
    };
  });

  const lockedPassRates = cases
    .map((item) => item.summary?.passRate)
    .filter((rate): rate is number => rate !== null && rate !== undefined);

  return {
    manifest,
    cases,
    overallPassRate:
      lockedPassRates.length > 0
        ? Math.round(
            lockedPassRates.reduce((sum, rate) => sum + rate, 0) /
              lockedPassRates.length,
          )
        : null,
    methodology:
      "Golden dataset of three mobile-app frames. Vision runs are captured offline " +
      "(one case at a time, up to 10 runs each). After human review, expected findings " +
      "are locked in evals/golden/*/expected.json. CI replays committed run outputs — " +
      "no live Gemini calls in tests.",
  };
}
