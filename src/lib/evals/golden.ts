import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  crossModalFilter,
  verifyGroundedness,
} from "@/lib/agent/guardrails";
import type { FigmaNode } from "@/lib/figma/node";
import { extractFigmaDocuments, walkFigmaTree } from "@/lib/figma/tree";
import { EVAL_CASE_ORDER, EVAL_RUNS_PER_CASE } from "@/lib/evals/cases";
import type {
  EvalCaseId,
  EvalRunRecord,
  EvalSuiteManifest,
  ExpectedFinding,
} from "@/lib/evals/types";
import type { AIEnrichmentItem } from "@/lib/types";

const EVALS_ROOT = path.join(process.cwd(), "evals");

export function getEvalsRoot(): string {
  return EVALS_ROOT;
}

export function getGoldenCaseDir(caseId: EvalCaseId): string {
  return path.join(EVALS_ROOT, "golden", caseId);
}

export function getResultsCaseDir(caseId: EvalCaseId): string {
  return path.join(EVALS_ROOT, "results", caseId);
}

export function getSuiteManifestPath(): string {
  return path.join(EVALS_ROOT, "suite.json");
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function loadSuiteManifest(): EvalSuiteManifest {
  const manifestPath = getSuiteManifestPath();
  if (!existsSync(manifestPath)) {
    return createDefaultSuiteManifest();
  }
  return readJsonFile<EvalSuiteManifest>(manifestPath);
}

export function createDefaultSuiteManifest(): EvalSuiteManifest {
  const caseStatus = Object.fromEntries(
    EVAL_CASE_ORDER.map((caseId) => [
      caseId,
      { runsCompleted: 0, locked: false, lockedAt: null },
    ]),
  ) as EvalSuiteManifest["caseStatus"];

  return {
    version: 1,
    runsPerCase: EVAL_RUNS_PER_CASE,
    cases: [...EVAL_CASE_ORDER],
    caseStatus,
  };
}

export function loadGoldenNodes(caseId: EvalCaseId): unknown {
  const nodesPath = path.join(getGoldenCaseDir(caseId), "nodes.json");
  if (!existsSync(nodesPath)) {
    throw new Error(`Missing golden nodes for ${caseId}: ${nodesPath}`);
  }
  return readJsonFile(nodesPath);
}

export function loadExpectedFindings(caseId: EvalCaseId): ExpectedFinding[] {
  const expectedPath = path.join(getGoldenCaseDir(caseId), "expected.json");
  if (!existsSync(expectedPath)) {
    return [];
  }
  const data = readJsonFile<{ findings?: ExpectedFinding[] } | ExpectedFinding[]>(
    expectedPath,
  );
  return Array.isArray(data) ? data : (data.findings ?? []);
}

export function buildNodeIndexFromGolden(caseId: EvalCaseId): {
  nodeIds: Set<string>;
  nodeMap: Map<string, FigmaNode>;
} {
  const nodeIds = new Set<string>();
  const nodeMap = new Map<string, FigmaNode>();
  const nodes = loadGoldenNodes(caseId);

  for (const doc of extractFigmaDocuments(nodes)) {
    walkFigmaTree(doc, (node) => {
      nodeIds.add(node.id);
      nodeMap.set(node.id, node);
    });
  }

  return { nodeIds, nodeMap };
}

export function applyVisionGuardrails(
  enrichments: AIEnrichmentItem[],
  caseId: EvalCaseId,
): AIEnrichmentItem[] {
  const { nodeIds, nodeMap } = buildNodeIndexFromGolden(caseId);
  const grounded = verifyGroundedness(enrichments, nodeIds);
  return crossModalFilter(grounded, nodeMap);
}

export function listRunRecords(caseId: EvalCaseId): EvalRunRecord[] {
  const resultsDir = getResultsCaseDir(caseId);
  if (!existsSync(resultsDir)) {
    return [];
  }

  const runs: EvalRunRecord[] = [];
  for (let i = 1; i <= EVAL_RUNS_PER_CASE; i += 1) {
    const runPath = path.join(resultsDir, `run-${String(i).padStart(2, "0")}.json`);
    if (!existsSync(runPath)) continue;
    runs.push(readJsonFile<EvalRunRecord>(runPath));
  }

  return runs.sort((left, right) => left.runIndex - right.runIndex);
}

export function goldenImageExists(caseId: EvalCaseId): boolean {
  return existsSync(
    path.join(process.cwd(), "public", "evals", "golden", caseId, "image.png"),
  );
}

export function readGoldenNodesPreview(caseId: EvalCaseId, maxChars = 4000): string {
  const nodesPath = path.join(getGoldenCaseDir(caseId), "nodes.json");
  if (!existsSync(nodesPath)) {
    return "(nodes.json not found — run pnpm eval:setup)";
  }
  const raw = readFileSync(nodesPath, "utf8");
  return raw.length > maxChars ? `${raw.slice(0, maxChars)}\n…` : raw;
}
