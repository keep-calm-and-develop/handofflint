#!/usr/bin/env tsx
/**
 * Fetch raw Figma file/nodes + images API responses for a design URL.
 *
 * Usage:
 *   pnpm fetch-figma "https://www.figma.com/design/<fileKey>/...?node-id=1-4"
 *   pnpm fetch-figma <url> --out-dir ./my-output --scale 2 --format png
 *
 * Requires FIGMA_ACCESS_TOKEN in .env or the environment.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const FIGMA_API_BASE = "https://api.figma.com/v1";
const MAX_IDS_PER_REQUEST = 50;
const DEFAULT_OUT_DIR = "figma-output";

type ImageFormat = "png" | "jpg" | "svg" | "pdf";

interface ParsedFigmaUrl {
  fileKey: string;
  nodeId: string | null;
}

interface CliOptions {
  url: string;
  outDir: string;
  token: string | null;
  scale: number;
  format: ImageFormat;
  depth: number | null;
  downloadImages: boolean;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
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

function parseArgs(argv: string[]): CliOptions {
  const positional: string[] = [];
  let outDir = DEFAULT_OUT_DIR;
  let token: string | null = null;
  let scale = 2;
  let format: ImageFormat = "png";
  let depth: number | null = null;
  let downloadImages = true;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--out-dir":
        outDir = argv[++i] ?? outDir;
        break;
      case "--token":
        token = argv[++i] ?? null;
        break;
      case "--scale":
        scale = Number(argv[++i]);
        break;
      case "--format":
        format = (argv[++i] ?? format) as ImageFormat;
        break;
      case "--depth":
        depth = Number(argv[++i]);
        break;
      case "--no-download-images":
        downloadImages = false;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          printHelp();
          process.exit(1);
        }
        positional.push(arg);
    }
  }

  const url = positional[0];
  if (!url) {
    console.error("Error: Figma URL is required.\n");
    printHelp();
    process.exit(1);
  }

  if (!Number.isFinite(scale) || scale < 0.01 || scale > 4) {
    console.error("Error: --scale must be between 0.01 and 4.");
    process.exit(1);
  }

  if (!["png", "jpg", "svg", "pdf"].includes(format)) {
    console.error("Error: --format must be png, jpg, svg, or pdf.");
    process.exit(1);
  }

  if (depth !== null && (!Number.isFinite(depth) || depth < 1)) {
    console.error("Error: --depth must be a positive number.");
    process.exit(1);
  }

  return { url, outDir, token, scale, format, depth, downloadImages };
}

function printHelp(): void {
  console.log(`Fetch raw Figma nodes + images API output for a design URL.

Usage:
  pnpm fetch-figma <figma-url> [options]

Options:
  --out-dir <path>       Output root (default: ${DEFAULT_OUT_DIR})
  --token <pat>          Figma PAT (default: FIGMA_ACCESS_TOKEN from .env)
  --scale <n>            Image render scale 0.01–4 (default: 2)
  --format <fmt>         png | jpg | svg | pdf (default: png)
  --depth <n>            File tree depth when URL has no node-id
  --no-download-images   Skip downloading rendered image binaries
  -h, --help             Show this help

Output layout:
  <out-dir>/<fileKey>_<timestamp>/
    manifest.json
    nodes/
      request.json
      response.json
      error.json           (on API failure — full raw error body)
    images/
      batch-000-request.json
      batch-000-response.json
      batch-000-error.json (on API failure — full raw error body)
      downloads/           (when --no-download-images is not set)

On failure, the full raw response (status, headers, body) is printed to stderr.
`);
}

function parseFigmaUrl(raw: string): ParsedFigmaUrl {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Invalid Figma URL");
  }

  const host = parsed.hostname.replace(/^www\./, "");
  if (host !== "figma.com") {
    throw new Error("Invalid Figma URL — host must be figma.com");
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const typeIndex = segments.findIndex(
    (s) => s === "design" || s === "file" || s === "proto",
  );

  if (typeIndex === -1 || typeIndex + 1 >= segments.length) {
    throw new Error("Invalid Figma URL — missing file key");
  }

  const fileKey = segments[typeIndex + 1];
  if (!/^[a-zA-Z0-9]+$/.test(fileKey)) {
    throw new Error("Invalid Figma URL — bad file key");
  }

  const nodeIdParam = parsed.searchParams.get("node-id");
  const nodeId = nodeIdParam ? nodeIdParam.replace(/-/g, ":") : null;

  return { fileKey, nodeId };
}

function buildNodesUrl(
  fileKey: string,
  nodeId: string | null,
  depth: number | null,
): string {
  if (nodeId) {
    return `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`;
  }

  const url = new URL(`${FIGMA_API_BASE}/files/${fileKey}`);
  if (depth !== null) {
    url.searchParams.set("depth", String(depth));
  }
  return url.toString();
}

function buildImagesUrl(
  fileKey: string,
  nodeIds: string[],
  scale: number,
  format: ImageFormat,
): string {
  const ids = nodeIds.map(encodeURIComponent).join(",");
  return `${FIGMA_API_BASE}/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`;
}

class FigmaRequestError extends Error {
  constructor(
    message: string,
    readonly context: string,
    readonly url: string,
    readonly status: number,
    readonly statusText: string,
    readonly headers: Record<string, string>,
    readonly rawBody: string,
  ) {
    super(message);
    this.name = "FigmaRequestError";
  }
}

function headersToRecord(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

function logRawError(
  context: string,
  details: {
    url: string;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    rawBody: string;
  },
): void {
  console.error(`\n[error] ${context}`);
  console.error(`  URL:    ${details.url}`);
  console.error(`  Status: ${details.status} ${details.statusText}`);
  console.error("  Headers:");
  for (const [key, value] of Object.entries(details.headers)) {
    console.error(`    ${key}: ${value}`);
  }
  console.error("  Raw body:");
  if (details.rawBody) {
    console.error(details.rawBody);
  } else {
    console.error("  (empty)");
  }
}

async function readResponseBody(res: Response): Promise<string> {
  return res.text();
}

async function figmaFetch(
  url: string,
  token: string,
  context: string,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-Figma-Token": token },
      cache: "no-store",
    });
  } catch (err) {
    console.error(`\n[error] ${context} — network failure`);
    console.error(err);
    throw err;
  }

  if (res.status === 429) {
    const rawBody = await readResponseBody(res);
    const headers = headersToRecord(res.headers);
    const retryAfter = headers["retry-after"] ?? "60";
    logRawError(context, {
      url,
      status: res.status,
      statusText: res.statusText,
      headers,
      rawBody,
    });
    throw new FigmaRequestError(
      `Figma rate limited — retry after ${retryAfter}s`,
      context,
      url,
      res.status,
      res.statusText,
      headers,
      rawBody,
    );
  }

  return res;
}

async function parseFigmaJson(
  res: Response,
  context: string,
  url: string,
): Promise<unknown> {
  const rawBody = await readResponseBody(res);
  const headers = headersToRecord(res.headers);

  if (!res.ok) {
    logRawError(context, {
      url,
      status: res.status,
      statusText: res.statusText,
      headers,
      rawBody,
    });
    throw new FigmaRequestError(
      `Figma API ${res.status}: ${rawBody || res.statusText}`,
      context,
      url,
      res.status,
      res.statusText,
      headers,
      rawBody,
    );
  }

  if (!rawBody) {
    logRawError(context, {
      url,
      status: res.status,
      statusText: res.statusText,
      headers,
      rawBody,
    });
    throw new FigmaRequestError(
      "Figma API returned empty body",
      context,
      url,
      res.status,
      res.statusText,
      headers,
      rawBody,
    );
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    logRawError(context, {
      url,
      status: res.status,
      statusText: res.statusText,
      headers,
      rawBody,
    });
    throw new FigmaRequestError(
      "Figma API returned non-JSON body",
      context,
      url,
      res.status,
      res.statusText,
      headers,
      rawBody,
    );
  }
}

function assertImagesApiOk(
  rawBody: unknown,
  context: string,
  url: string,
): void {
  if (typeof rawBody !== "object" || rawBody === null) return;

  const err = (rawBody as { err?: unknown }).err;
  if (!err) return;

  const serialized = JSON.stringify(rawBody, null, 2);
  console.error(`\n[error] ${context} — images API returned err field`);
  console.error(`  URL: ${url}`);
  console.error("  Raw body:");
  console.error(serialized);
  throw new FigmaRequestError(
    `Figma images API error: ${String(err)}`,
    context,
    url,
    200,
    "OK",
    {},
    serialized,
  );
}

async function saveErrorArtifact(
  dir: string,
  name: string,
  err: FigmaRequestError,
): Promise<void> {
  await writeJson(path.join(dir, name), {
    context: err.context,
    url: err.url,
    status: err.status,
    statusText: err.statusText,
    headers: err.headers,
    rawBody: err.rawBody,
    message: err.message,
  });
}

function isFigmaNode(value: unknown): value is FigmaNode {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.type === "string"
  );
}

function extractDocuments(data: unknown): FigmaNode[] {
  if (!data || typeof data !== "object") return [];

  const root = data as Record<string, unknown>;

  if (isFigmaNode(root.document)) {
    return [root.document];
  }

  if (root.nodes && typeof root.nodes === "object") {
    return Object.values(root.nodes as Record<string, unknown>)
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        if (record.document && isFigmaNode(record.document)) {
          return record.document;
        }
        return isFigmaNode(record) ? record : null;
      })
      .filter((doc): doc is FigmaNode => doc != null);
  }

  return [];
}

function collectNodeIds(roots: FigmaNode[]): string[] {
  const ids: string[] = [];

  function walk(node: FigmaNode): void {
    ids.push(node.id);
    for (const child of node.children ?? []) {
      walk(child);
    }
  }

  for (const root of roots) {
    walk(root);
  }

  return ids;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function downloadImage(
  url: string,
  destPath: string,
  nodeId: string,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    console.error(`\n[error] image download for ${nodeId} — network failure`);
    console.error(`  URL: ${url}`);
    console.error(err);
    throw err;
  }

  if (!res.ok) {
    const rawBody = await readResponseBody(res);
    logRawError(`image download for ${nodeId}`, {
      url,
      status: res.status,
      statusText: res.statusText,
      headers: headersToRecord(res.headers),
      rawBody,
    });
    throw new Error(`Image download failed (${res.status})`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buffer);
}

async function main(): Promise<void> {
  loadDotEnv();

  const options = parseArgs(process.argv.slice(2));
  const token =
    options.token?.trim() || process.env.FIGMA_ACCESS_TOKEN?.trim();

  if (!token) {
    console.error(
      "Error: Set FIGMA_ACCESS_TOKEN in .env or pass --token <pat>.",
    );
    process.exit(1);
  }

  let parsed: ParsedFigmaUrl;
  try {
    parsed = parseFigmaUrl(options.url);
  } catch (err) {
    console.error(
      `Error: ${err instanceof Error ? err.message : "Invalid URL"}`,
    );
    process.exit(1);
  }

  const runDir = path.resolve(
    options.outDir,
    `${parsed.fileKey}_${timestampSlug()}`,
  );
  const nodesDir = path.join(runDir, "nodes");
  const imagesDir = path.join(runDir, "images");
  const downloadsDir = path.join(imagesDir, "downloads");

  await mkdir(nodesDir, { recursive: true });
  await mkdir(imagesDir, { recursive: true });
  if (options.downloadImages) {
    await mkdir(downloadsDir, { recursive: true });
  }

  console.log(`Output: ${runDir}`);
  console.log(`fileKey: ${parsed.fileKey}`);
  console.log(`nodeId:  ${parsed.nodeId ?? "(full file)"}`);

  const nodesRequestUrl = buildNodesUrl(
    parsed.fileKey,
    parsed.nodeId,
    options.depth,
  );

  console.log(`\n[nodes] GET ${nodesRequestUrl}`);
  let nodesBody: unknown;
  try {
    const nodesRes = await figmaFetch(nodesRequestUrl, token, "nodes API");
    nodesBody = await parseFigmaJson(nodesRes, "nodes API", nodesRequestUrl);
  } catch (err) {
    if (err instanceof FigmaRequestError) {
      await saveErrorArtifact(nodesDir, "error.json", err);
      console.error(`[nodes] saved error.json`);
    }
    throw err;
  }

  await writeJson(path.join(nodesDir, "request.json"), {
    method: "GET",
    url: nodesRequestUrl,
    endpoint: parsed.nodeId ? "files/:key/nodes" : "files/:key",
    fileKey: parsed.fileKey,
    nodeId: parsed.nodeId,
    depth: options.depth,
    status: 200,
    statusText: "OK",
  });
  await writeJson(path.join(nodesDir, "response.json"), nodesBody);
  console.log("[nodes] saved response.json");

  const documents = extractDocuments(nodesBody);
  const nodeIds = parsed.nodeId
    ? [parsed.nodeId]
    : collectNodeIds(documents);

  if (nodeIds.length === 0) {
    console.warn("[images] no node IDs found — skipping images API");
  } else {
    console.log(`[images] fetching ${nodeIds.length} node(s)`);
    const batches = chunk(nodeIds, MAX_IDS_PER_REQUEST);

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      const batchId = String(i).padStart(3, "0");
      const imagesRequestUrl = buildImagesUrl(
        parsed.fileKey,
        batch,
        options.scale,
        options.format,
      );

      console.log(`[images] batch ${batchId}: GET ${imagesRequestUrl}`);
      let imagesBody: unknown;
      try {
        const imagesRes = await figmaFetch(
          imagesRequestUrl,
          token,
          `images API batch ${batchId}`,
        );
        imagesBody = await parseFigmaJson(
          imagesRes,
          `images API batch ${batchId}`,
          imagesRequestUrl,
        );
        assertImagesApiOk(
          imagesBody,
          `images API batch ${batchId}`,
          imagesRequestUrl,
        );
      } catch (err) {
        if (err instanceof FigmaRequestError) {
          await saveErrorArtifact(
            imagesDir,
            `batch-${batchId}-error.json`,
            err,
          );
          console.error(`[images] saved batch-${batchId}-error.json`);
        }
        throw err;
      }

      await writeJson(
        path.join(imagesDir, `batch-${batchId}-request.json`),
        {
          method: "GET",
          url: imagesRequestUrl,
          endpoint: "images/:key",
          fileKey: parsed.fileKey,
          nodeIds: batch,
          scale: options.scale,
          format: options.format,
          status: 200,
          statusText: "OK",
        },
      );
      await writeJson(
        path.join(imagesDir, `batch-${batchId}-response.json`),
        imagesBody,
      );
      console.log(`[images] saved batch-${batchId}-response.json`);

      if (options.downloadImages) {
        const images =
          typeof imagesBody === "object" &&
          imagesBody !== null &&
          "images" in imagesBody &&
          typeof (imagesBody as { images: unknown }).images === "object"
            ? ((imagesBody as { images: Record<string, string | null> }).images)
            : {};

        for (const [nodeId, imageUrl] of Object.entries(images)) {
          if (!imageUrl) {
            console.log(`[images] skip download for ${nodeId} (null URL)`);
            continue;
          }

          const safeId = nodeId.replace(/:/g, "-");
          const ext = options.format === "jpg" ? "jpg" : options.format;
          const dest = path.join(downloadsDir, `${safeId}.${ext}`);

          try {
            await downloadImage(imageUrl, dest, nodeId);
            console.log(`[images] downloaded ${safeId}.${ext}`);
          } catch (err) {
            console.warn(
              `[images] failed to download ${nodeId}: ${
                err instanceof Error ? err.message : "unknown error"
              }`,
            );
          }
        }
      }
    }
  }

  await writeJson(path.join(runDir, "manifest.json"), {
    inputUrl: options.url,
    fileKey: parsed.fileKey,
    nodeId: parsed.nodeId,
    fetchedAt: new Date().toISOString(),
    nodeCount: nodeIds.length,
    options: {
      scale: options.scale,
      format: options.format,
      depth: options.depth,
      downloadImages: options.downloadImages,
    },
    folders: {
      nodes: "nodes/",
      images: "images/",
    },
  });

  console.log("\nDone.");
}

main().catch((err) => {
  if (err instanceof FigmaRequestError) {
    console.error(`\nFailed: ${err.message}`);
  } else {
    console.error("\nFailed:");
    console.error(err);
  }
  process.exit(1);
});
