#!/usr/bin/env tsx
/**
 * Show offline vision eval progress per case.
 *
 * Usage: pnpm eval:status
 */

import { existsSync } from "node:fs";

import { EVAL_CASE_ORDER, EVAL_CASES, getPriorEvalCase } from "../src/lib/evals/cases";
import { getRunPath, readSuiteManifest } from "./eval-lib";

function main(): void {
  const manifest = readSuiteManifest();

  console.log("Vision eval suite status\n");

  for (const caseId of EVAL_CASE_ORDER) {
    const status = manifest.caseStatus[caseId];
    const prior = getPriorEvalCase(caseId);
    const priorLocked = prior ? manifest.caseStatus[prior].locked : true;
    const completed = Array.from({ length: manifest.runsPerCase }, (_, index) => index + 1).filter(
      (runIndex) => existsSync(getRunPath(caseId, runIndex)),
    ).length;

    const gate =
      prior && !priorLocked
        ? `blocked (lock ${prior} first)`
        : status.locked
          ? "locked"
          : completed >= manifest.runsPerCase
            ? "ready to lock"
            : "capturing";

    console.log(`${EVAL_CASES[caseId].label}`);
    console.log(`  id:      ${caseId}`);
    console.log(`  runs:    ${completed}/${manifest.runsPerCase}`);
    console.log(`  status:  ${gate}`);

    if (!status.locked && priorLocked && completed < manifest.runsPerCase) {
      console.log(
        `  next:    pnpm eval:capture --case ${caseId} --run ${completed + 1}`,
      );
    } else if (!status.locked && completed >= manifest.runsPerCase) {
      console.log(`  next:    pnpm eval:lock --case ${caseId}`);
    }

    console.log("");
  }
}

main();
