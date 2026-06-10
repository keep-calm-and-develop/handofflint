#!/usr/bin/env tsx
/**
 * Capture one vision eval run for a single golden case.
 *
 * Prerequisites:
 *   1. pnpm eval:setup
 *   2. EVAL_ALLOW_LOCAL_IMAGES=true in .env
 *   3. pnpm dev running on localhost:3000
 *
 * Usage:
 *   pnpm eval:capture --case vaxin-1-4 --run 1
 *   pnpm eval:capture --case vaxin-1-4          # next incomplete run
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import { DEFAULT_DESIGN_MANUAL_URL } from "../src/lib/agent/constants";
import {
  consumeVisionStreamChunks,
  countAgentTurnsWithTools,
  finalizeVisionStream,
  INITIAL_VISION_ACTIVITY,
  parseSseBuffer,
  type VisionStreamParseResult,
} from "../src/lib/agent/vision-stream";
import {
  FIGMA_ACCESS_TOKEN_HEADER,
  GOOGLE_GENERATIVE_AI_API_KEY_HEADER,
} from "../src/lib/agent-credentials";
import {
  EVAL_CASE_ORDER,
  EVAL_CASES,
  EVAL_RUNS_PER_CASE,
  getPriorEvalCase,
  isEvalCaseId,
} from "../src/lib/evals/cases";
import { applyVisionGuardrails } from "../src/lib/evals/golden";
import type { EvalCaseId, EvalRunRecord } from "../src/lib/evals/types";
import {
  getCaseResultsDir,
  getRunPath,
  loadDotEnv,
  readSuiteManifest,
  waitForDevServer,
  writeSuiteManifest,
} from "./eval-lib";

interface CliOptions {
  caseId: EvalCaseId;
  runIndex: number | null;
  baseUrl: string;
}

function parseArgs(argv: string[]): CliOptions {
  let caseId: EvalCaseId | null = null;
  let runIndex: number | null = null;
  let baseUrl = "http://127.0.0.1:3000";

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
    if (arg === "--run") {
      runIndex = Number(argv[++i]);
      continue;
    }
    if (arg === "--base-url") {
      baseUrl = argv[++i] ?? baseUrl;
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

  if (
    runIndex !== null &&
    (!Number.isFinite(runIndex) || runIndex < 1 || runIndex > EVAL_RUNS_PER_CASE)
  ) {
    console.error(`--run must be between 1 and ${EVAL_RUNS_PER_CASE}`);
    process.exit(1);
  }

  return { caseId, runIndex, baseUrl };
}

function printHelp(): void {
  console.log(`Capture one offline vision eval run for a golden case.

Usage:
  pnpm eval:capture --case <case-id> [--run N] [--base-url URL]

Cases (in order):
  ${EVAL_CASE_ORDER.join(", ")}

Rules:
  - Run cases in order. Case N+1 is blocked until case N is locked.
  - Within a case, run --run 1..${EVAL_RUNS_PER_CASE} one at a time.
  - After all runs, review outputs and run: pnpm eval:lock --case <id>

Requires:
  pnpm dev
  EVAL_ALLOW_LOCAL_IMAGES=true
  GOOGLE_GENERATIVE_AI_API_KEY in .env
`);
}

function assertCaseUnlocked(manifestCaseId: EvalCaseId): void {
  const prior = getPriorEvalCase(manifestCaseId);
  if (!prior) return;

  const manifest = readSuiteManifest();
  const priorStatus = manifest.caseStatus[prior];
  if (!priorStatus.locked) {
    console.error(
      `Blocked: lock "${prior}" before capturing "${manifestCaseId}".\n` +
        `  1. Finish ${manifest.runsPerCase} runs for ${prior}\n` +
        `  2. pnpm eval:lock --case ${prior}`,
    );
    process.exit(1);
  }
}

function resolveRunIndex(caseId: EvalCaseId, requested: number | null): number {
  if (requested !== null) return requested;

  const manifest = readSuiteManifest();
  const completed = manifest.caseStatus[caseId].runsCompleted;
  if (completed >= EVAL_RUNS_PER_CASE) {
    console.error(
      `All ${EVAL_RUNS_PER_CASE} runs already captured for ${caseId}. ` +
        `Use --run N to overwrite a specific run, or pnpm eval:lock --case ${caseId}.`,
    );
    process.exit(1);
  }

  return completed + 1;
}

function buildHeaders(): Record<string, string> {
  const figmaToken = process.env.FIGMA_ACCESS_TOKEN?.trim() ?? "eval-placeholder";
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (!googleKey) {
    console.error("GOOGLE_GENERATIVE_AI_API_KEY is required in .env");
    process.exit(1);
  }

  return {
    "Content-Type": "application/json",
    [FIGMA_ACCESS_TOKEN_HEADER]: figmaToken,
    [GOOGLE_GENERATIVE_AI_API_KEY_HEADER]: googleKey,
  };
}

async function seedCase(
  baseUrl: string,
  caseId: EvalCaseId,
  headers: Record<string, string>,
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/evals/seed`, {
    method: "POST",
    headers,
    body: JSON.stringify({ caseId }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Seed failed (${res.status}): ${body.slice(0, 300)}`);
  }
}

async function captureVisionRun(
  baseUrl: string,
  caseId: EvalCaseId,
  headers: Record<string, string>,
): Promise<VisionStreamParseResult> {
  const meta = EVAL_CASES[caseId];
  const imageUrl = `${baseUrl}${meta.imagePath}`;

  const res = await fetch(`${baseUrl}/api/agent/vision`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fileKey: meta.fileKey,
      nodeId: meta.nodeId,
      imageUrl,
      layoutProfile: meta.layoutProfile,
      designManualUrl: DEFAULT_DESIGN_MANUAL_URL,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vision failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const body = res.body;
  if (!body) {
    throw new Error("Vision stream body missing");
  }

  let streamState: VisionStreamParseResult = {
    activity: { ...INITIAL_VISION_ACTIVITY, phase: "connecting" },
    textBuffer: "",
  };
  let sseBuffer = "";
  const reader = body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(sseBuffer);
    sseBuffer = parsed.remainder;
    streamState = consumeVisionStreamChunks(parsed.events, streamState);
  }

  if (sseBuffer.trim()) {
    const parsed = parseSseBuffer(`${sseBuffer}\n`);
    streamState = consumeVisionStreamChunks(parsed.events, streamState);
  }

  return finalizeVisionStream(streamState);
}

async function main(): Promise<void> {
  loadDotEnv();
  const options = parseArgs(process.argv.slice(2));
  const manifest = readSuiteManifest();

  if (manifest.caseStatus[options.caseId].locked) {
    console.error(
      `Case ${options.caseId} is locked. Unlock expected.json workflow before overwriting runs.`,
    );
    process.exit(1);
  }

  assertCaseUnlocked(options.caseId);

  const runIndex = resolveRunIndex(options.caseId, options.runIndex);
  const imagePath = `public${EVAL_CASES[options.caseId].imagePath}`;
  if (!existsSync(imagePath)) {
    console.error(`Missing golden image: ${imagePath}\nRun pnpm eval:setup`);
    process.exit(1);
  }

  if (process.env.EVAL_ALLOW_LOCAL_IMAGES !== "true") {
    console.error("Set EVAL_ALLOW_LOCAL_IMAGES=true in .env for local golden images.");
    process.exit(1);
  }

  await waitForDevServer(options.baseUrl);
  const headers = buildHeaders();

  console.log(`[capture] case=${options.caseId} run=${runIndex}`);
  await seedCase(options.baseUrl, options.caseId, headers);

  let streamState: VisionStreamParseResult;
  try {
    streamState = await captureVisionRun(options.baseUrl, options.caseId, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vision capture failed";
    const record: EvalRunRecord = {
      caseId: options.caseId,
      runIndex,
      capturedAt: new Date().toISOString(),
      layoutProfile: EVAL_CASES[options.caseId].layoutProfile,
      rawEnrichments: [],
      verifiedEnrichments: [],
      stepsUsed: 0,
      toolCallCount: 0,
      error: message,
    };

    mkdirSync(getCaseResultsDir(options.caseId), { recursive: true });
    writeFileSync(
      getRunPath(options.caseId, runIndex),
      `${JSON.stringify(record, null, 2)}\n`,
      "utf8",
    );
    console.error(message);
    process.exit(1);
  }

  const rawEnrichments = streamState.activity.enrichments ?? [];
  const verifiedEnrichments = applyVisionGuardrails(
    rawEnrichments,
    options.caseId,
  );

  const record: EvalRunRecord = {
    caseId: options.caseId,
    runIndex,
    capturedAt: new Date().toISOString(),
    layoutProfile: EVAL_CASES[options.caseId].layoutProfile,
    rawEnrichments,
    verifiedEnrichments,
    stepsUsed: countAgentTurnsWithTools(streamState.activity.toolCalls),
    toolCallCount: streamState.activity.toolCalls.length,
    error: streamState.activity.error,
  };

  mkdirSync(getCaseResultsDir(options.caseId), { recursive: true });
  writeFileSync(getRunPath(options.caseId, runIndex), `${JSON.stringify(record, null, 2)}\n`, "utf8");

  const completedRuns = new Set<number>();
  for (let i = 1; i <= EVAL_RUNS_PER_CASE; i += 1) {
    if (existsSync(getRunPath(options.caseId, i))) {
      completedRuns.add(i);
    }
  }

  manifest.caseStatus[options.caseId].runsCompleted = completedRuns.size;
  writeSuiteManifest(manifest);

  console.log(
    `[capture] saved ${getRunPath(options.caseId, runIndex)}\n` +
      `  raw=${rawEnrichments.length} verified=${verifiedEnrichments.length} ` +
      `tools=${record.toolCallCount}`,
  );

  if (completedRuns.size >= EVAL_RUNS_PER_CASE) {
    console.log(
      `\nAll ${EVAL_RUNS_PER_CASE} runs captured for ${options.caseId}. ` +
        `Review evals/results/${options.caseId}/ then run:\n` +
        `  pnpm eval:lock --case ${options.caseId}`,
    );
  } else {
    console.log(
      `\nNext: pnpm eval:capture --case ${options.caseId} --run ${runIndex + 1}`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
