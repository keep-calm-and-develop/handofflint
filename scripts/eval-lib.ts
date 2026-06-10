import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import type { EvalCaseId, EvalSuiteManifest } from "../src/lib/evals/types";

export const PROJECT_ROOT = process.cwd();
export const EVALS_ROOT = path.join(PROJECT_ROOT, "evals");

export function loadDotEnv(): void {
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function readSuiteManifest(): EvalSuiteManifest {
  const manifestPath = path.join(EVALS_ROOT, "suite.json");
  if (!existsSync(manifestPath)) {
    throw new Error("evals/suite.json missing — run pnpm eval:setup first");
  }
  return JSON.parse(readFileSync(manifestPath, "utf8")) as EvalSuiteManifest;
}

export function writeSuiteManifest(manifest: EvalSuiteManifest): void {
  const manifestPath = path.join(EVALS_ROOT, "suite.json");
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export function getCaseResultsDir(caseId: EvalCaseId): string {
  return path.join(EVALS_ROOT, "results", caseId);
}

export function getRunPath(caseId: EvalCaseId, runIndex: number): string {
  return path.join(
    getCaseResultsDir(caseId),
    `run-${String(runIndex).padStart(2, "0")}.json`,
  );
}

export async function waitForDevServer(baseUrl: string): Promise<void> {
  try {
    const res = await fetch(baseUrl, { method: "GET" });
    if (res.ok) return;
  } catch {
    // fall through
  }

  throw new Error(
    `Dev server not reachable at ${baseUrl}. Start it with: pnpm dev`,
  );
}
