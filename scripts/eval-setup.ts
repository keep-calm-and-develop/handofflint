#!/usr/bin/env tsx
/**
 * Copy golden Figma fixtures into evals/golden and public/evals/golden.
 *
 * Usage: pnpm eval:setup
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { EVAL_CASE_ORDER, EVAL_CASES, EVAL_RUNS_PER_CASE } from "../src/lib/evals/cases";
import type { EvalCaseId, EvalSuiteManifest } from "../src/lib/evals/types";
import { PROJECT_ROOT } from "./eval-lib";

/** Canonical Figma render for example.json node 1:4 (see figma-api-image-response.txt). */
const VAXIN_1_4_IMAGE_URL =
  "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/33f30ad2-8de0-4e29-a22e-d47ecf272e67";

interface SourceMapping {
  nodes: string;
  image?: string;
  imageUrl?: string;
}

const SOURCES: Record<EvalCaseId, SourceMapping> = {
  "vaxin-1-4": {
    nodes: "example.json",
    image: findFigmaOutputImage("kvT3qcauDE67CW76Kb56Qw", "1:4"),
    imageUrl: VAXIN_1_4_IMAGE_URL,
  },
  "vaxin-20-0": {
    nodes:
      "figma-output/kvT3qcauDE67CW76Kb56Qw_2026-06-10T08-28-44-322Z/nodes/response.json",
    image:
      "figma-output/kvT3qcauDE67CW76Kb56Qw_2026-06-10T08-28-44-322Z/images/downloads/20-0.png",
  },
  "bittersweet-9-153": {
    nodes:
      "figma-output/Ii83n99A2f6VqzHNerla4d_2026-06-10T08-27-21-282Z/nodes/response.json",
    image:
      "figma-output/Ii83n99A2f6VqzHNerla4d_2026-06-10T08-27-21-282Z/images/downloads/9-153.png",
  },
};

function findFigmaOutputImage(fileKey: string, nodeId: string): string | undefined {
  const figmaOutput = path.join(PROJECT_ROOT, "figma-output");
  if (!existsSync(figmaOutput)) return undefined;

  const safeNode = nodeId.replace(/:/g, "-");
  for (const entry of readDirSafe(figmaOutput)) {
    const manifestPath = path.join(figmaOutput, entry, "manifest.json");
    const imagePath = path.join(
      figmaOutput,
      entry,
      "images",
      "downloads",
      `${safeNode}.png`,
    );
    if (!existsSync(manifestPath) || !existsSync(imagePath)) continue;

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      fileKey?: string;
      nodeId?: string;
    };
    if (manifest.fileKey === fileKey && manifest.nodeId === nodeId) {
      return path.relative(PROJECT_ROOT, imagePath);
    }
  }

  return undefined;
}

function readDirSafe(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function copyIfExists(src: string, dest: string): boolean {
  const absSrc = path.join(PROJECT_ROOT, src);
  if (!existsSync(absSrc)) return false;
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(absSrc, dest);
  return true;
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, buffer);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const warnings: string[] = [];

  for (const caseId of EVAL_CASE_ORDER) {
    const meta = EVAL_CASES[caseId];
    const source = SOURCES[caseId];
    const goldenDir = path.join(PROJECT_ROOT, "evals", "golden", caseId);
    const publicImageDir = path.join(
      PROJECT_ROOT,
      "public",
      "evals",
      "golden",
      caseId,
    );

    mkdirSync(goldenDir, { recursive: true });
    mkdirSync(publicImageDir, { recursive: true });

    const nodesCopied = copyIfExists(
      source.nodes,
      path.join(goldenDir, "nodes.json"),
    );
    if (!nodesCopied) {
      warnings.push(`[${caseId}] missing nodes source: ${source.nodes}`);
    }

    const expectedPath = path.join(goldenDir, "expected.json");
    if (!existsSync(expectedPath)) {
      writeFileSync(expectedPath, "{\n  \"findings\": []\n}\n", "utf8");
    }

    writeFileSync(
      path.join(goldenDir, "meta.json"),
      `${JSON.stringify(meta, null, 2)}\n`,
      "utf8",
    );

    const imageDest = path.join(publicImageDir, "image.png");
    let imageReady = false;

    if (source.image) {
      imageReady = copyIfExists(source.image, imageDest);
    }

    if (!imageReady && source.imageUrl) {
      imageReady = await downloadImage(source.imageUrl, imageDest);
      if (imageReady) {
        writeFileSync(
          path.join(goldenDir, "image-source.json"),
          `${JSON.stringify({ url: source.imageUrl }, null, 2)}\n`,
          "utf8",
        );
      }
    }

    if (!imageReady) {
      warnings.push(
        `[${caseId}] no image found — check figma-output or imageUrl in eval-setup.ts`,
      );
    }
  }

  const manifest: EvalSuiteManifest = {
    version: 1,
    runsPerCase: EVAL_RUNS_PER_CASE,
    cases: [...EVAL_CASE_ORDER],
    caseStatus: Object.fromEntries(
      EVAL_CASE_ORDER.map((caseId) => [
        caseId,
        { runsCompleted: 0, locked: false, lockedAt: null },
      ]),
    ) as EvalSuiteManifest["caseStatus"],
  };

  writeFileSync(
    path.join(PROJECT_ROOT, "evals", "suite.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log("Eval golden fixtures prepared under evals/golden/ and public/evals/golden/.");

  if (warnings.length > 0) {
    console.warn("\nWarnings:");
    for (const warning of warnings) {
      console.warn(`  - ${warning}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
