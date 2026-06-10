#!/usr/bin/env tsx
/**
 * Draft or finalize expected findings from captured vision runs.
 *
 * Usage:
 *   pnpm eval:lock --case vaxin-1-4              # print consensus draft
 *   pnpm eval:lock --case vaxin-1-4 --write      # write evals/golden/<case>/expected.json
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { EVAL_RUNS_PER_CASE, isEvalCaseId } from "../src/lib/evals/cases";
import type { EvalCaseId, EvalRunRecord, ExpectedFinding } from "../src/lib/evals/types";
import { PROJECT_ROOT, getRunPath, readSuiteManifest, writeSuiteManifest } from "./eval-lib";

const CONSENSUS_THRESHOLD = 0.6;

interface CliOptions {
  caseId: EvalCaseId;
  write: boolean;
  minRate: number;
}

function parseArgs(argv: string[]): CliOptions {
  let caseId: EvalCaseId | null = null;
  let write = false;
  let minRate = CONSENSUS_THRESHOLD;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--case") {
      const value = argv[++i] ?? "";
      if (!isEvalCaseId(value)) {
        console.error(`Unknown case: ${value}`);
        process.exit(1);
      }
      caseId = value;
      continue;
    }
    if (arg === "--write") {
      write = true;
      continue;
    }
    if (arg === "--min-rate") {
      minRate = Number(argv[++i]);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!caseId) {
    console.error("Missing required --case <id>\n");
    printHelp();
    process.exit(1);
  }

  return { caseId, write, minRate };
}

function printHelp(): void {
  console.log(`Draft expected findings from captured vision runs.

Usage:
  pnpm eval:lock --case <case-id> [--write] [--min-rate 0.6]

Without --write, prints a consensus draft for human review.
With --write, saves evals/golden/<case>/expected.json and marks the case locked.
`);
}

function loadRuns(caseId: EvalCaseId): EvalRunRecord[] {
  const runs: EvalRunRecord[] = [];
  for (let i = 1; i <= EVAL_RUNS_PER_CASE; i += 1) {
    const runPath = getRunPath(caseId, i);
    if (!existsSync(runPath)) continue;
    runs.push(JSON.parse(readFileSync(runPath, "utf8")) as EvalRunRecord);
  }
  return runs;
}

function buildConsensus(
  runs: EvalRunRecord[],
  minRate: number,
): ExpectedFinding[] {
  const successfulRuns = runs.filter((run) => !run.error);
  if (successfulRuns.length === 0) return [];

  const counts = new Map<
    string,
    { finding: ExpectedFinding; count: number }
  >();

  for (const run of successfulRuns) {
    const seen = new Set<string>();
    for (const item of run.verifiedEnrichments) {
      const key = `${item.nodeId}|${item.violationCategory}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          finding: {
            nodeId: item.nodeId,
            violationCategory: item.violationCategory,
            descriptionIncludes: item.perceptualFlawDescription
              .slice(0, 48)
              .toLowerCase(),
          },
          count: 1,
        });
      }
    }
  }

  const threshold = Math.ceil(successfulRuns.length * minRate);
  return Array.from(counts.values())
    .filter((entry) => entry.count >= threshold)
    .sort((left, right) => right.count - left.count)
    .map((entry) => entry.finding);
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const runs = loadRuns(options.caseId);
  const manifest = readSuiteManifest();

  if (runs.length < EVAL_RUNS_PER_CASE) {
    console.error(
      `Only ${runs.length}/${EVAL_RUNS_PER_CASE} runs captured for ${options.caseId}. ` +
        "Finish capture before locking.",
    );
    process.exit(1);
  }

  const draft = buildConsensus(runs, options.minRate);
  const successfulRuns = runs.filter((run) => !run.error).length;

  console.log(`Case: ${options.caseId}`);
  console.log(`Runs: ${runs.length} (${successfulRuns} successful)`);
  console.log(`Consensus (>=${Math.round(options.minRate * 100)}%): ${draft.length} findings\n`);

  for (const finding of draft) {
    console.log(
      `  - ${finding.violationCategory} @ ${finding.nodeId}` +
        (finding.descriptionIncludes
          ? ` — includes "${finding.descriptionIncludes}"`
          : ""),
    );
  }

  if (!options.write) {
    console.log(
      "\nReview the draft above. Edit as needed, then write with:\n" +
        `  pnpm eval:lock --case ${options.caseId} --write`,
    );
    return;
  }

  if (draft.length === 0) {
    console.error(
      "No consensus findings to write. Lower --min-rate or review run outputs manually.",
    );
    process.exit(1);
  }

  const expectedPath = path.join(
    PROJECT_ROOT,
    "evals",
    "golden",
    options.caseId,
    "expected.json",
  );

  writeFileSync(
    expectedPath,
    `${JSON.stringify({ findings: draft, lockedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );

  manifest.caseStatus[options.caseId].locked = true;
  manifest.caseStatus[options.caseId].lockedAt = new Date().toISOString();
  writeSuiteManifest(manifest);

  console.log(`\nWrote ${expectedPath}`);
  console.log(`Case ${options.caseId} is now locked.`);
}

main();
