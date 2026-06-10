import { describe, expect, it } from "vitest";

import { assertRunAgainstExpected, computePassRate } from "@/lib/evals/assert";
import { EVAL_CASE_ORDER } from "@/lib/evals/cases";
import {
  goldenImageExists,
  listRunRecords,
  loadExpectedFindings,
  loadGoldenNodes,
  loadSuiteManifest,
} from "@/lib/evals/golden";

describe("offline vision eval suite", () => {
  const manifest = loadSuiteManifest();

  it("defines three golden cases in order", () => {
    expect(manifest.cases).toEqual(EVAL_CASE_ORDER);
    expect(manifest.runsPerCase).toBe(10);
  });

  for (const caseId of EVAL_CASE_ORDER) {
    describe(caseId, () => {
      const status = manifest.caseStatus[caseId];
      const runs = listRunRecords(caseId);
      const expected = loadExpectedFindings(caseId);

      it("has golden nodes fixture", () => {
        expect(() => loadGoldenNodes(caseId)).not.toThrow();
      });

      it("has golden image fixture", () => {
        expect(goldenImageExists(caseId)).toBe(true);
      });

      if (!status.locked) {
        it("is pending calibration (skipped assertions until locked)", () => {
          expect(status.locked).toBe(false);
        });
        return;
      }

      it(`has ${manifest.runsPerCase} committed runs`, () => {
        expect(runs.length).toBe(manifest.runsPerCase);
      });

      it("has non-empty expected findings", () => {
        expect(expected.length).toBeGreaterThan(0);
      });

      it("meets pass-rate threshold on committed runs", () => {
        const results = runs.map((run) =>
          assertRunAgainstExpected(run.verifiedEnrichments, expected),
        );
        const passRate = computePassRate(results);
        expect(passRate).not.toBeNull();
        expect(passRate).toBeGreaterThanOrEqual(80);
      });

      it("finds each expected finding in at least one committed run", () => {
        for (const target of expected) {
          const found = runs.some((run) =>
            assertRunAgainstExpected(run.verifiedEnrichments, [target]).pass,
          );
          expect(found, `missing expected finding ${target.nodeId}/${target.violationCategory}`).toBe(
            true,
          );
        }
      });
    });
  }
});
