import {
  buildFigmaCacheKey,
  getFigmaTreeCache,
  isCacheFresh,
  isFigmaCacheEnabled,
  peekFigmaTreeCache,
  setFigmaTreeCache,
  type FigmaTreeCacheEntry,
} from "@/lib/figma/cache";
import {
  buildRateLimitMessage,
  parseRetryAfterSeconds,
} from "@/lib/figma/retry-after";
import type { FigmaDataSource } from "@/lib/types";

const FIGMA_API_BASE = "https://api.figma.com/v1";

export class FigmaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "FigmaApiError";
  }
}

/**
 * Fetches a node subtree when `nodeId` is set; otherwise file metadata + shallow tree.
 * Skips the request when `FIGMA_ACCESS_TOKEN` is unset.
 * Uses an in-memory version-aware cache when enabled (see FIGMA_CACHE_* env vars).
 * @see https://www.figma.com/developers/api#get-file-nodes-endpoint
 * @see https://www.figma.com/developers/api#get-files-endpoint
 */
export interface FetchFigmaTreeOptions {
  forceRefresh?: boolean;
}

export interface FetchFigmaTreeCacheInfo {
  hit: boolean;
  validatedAt: string;
  fetchedAt: string;
}

export interface FetchFigmaTreeResult {
  data: unknown;
  source: FigmaDataSource;
  cache?: FetchFigmaTreeCacheInfo;
}

interface FigmaFileMeta {
  version?: string;
}

type FigmaFileMetaResult =
  | { status: "ok"; version: string }
  | { status: "forbidden" }
  | { status: "rate_limited" }
  | { status: "error" };

function extractFigmaFileMeta(data: unknown): {
  version: string;
  lastModified: string;
} {
  if (typeof data !== "object" || data === null) {
    return { version: "", lastModified: "" };
  }

  const record = data as Record<string, unknown>;
  return {
    version: typeof record.version === "string" ? record.version : "",
    lastModified:
      typeof record.lastModified === "string" ? record.lastModified : "",
  };
}

function buildFigmaTreeUrl(fileKey: string, nodeId: string | null): string {
  return nodeId
    ? `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`
    : `${FIGMA_API_BASE}/files/${fileKey}?depth=2`;
}

async function figmaFetch(url: string, token: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { "X-Figma-Token": token },
    cache: "no-store",
  });

  if (res.status === 429) {
    const retryAfterSec = parseRetryAfterSeconds(res.headers.get("Retry-After"));
    throw new FigmaApiError(
      buildRateLimitMessage(retryAfterSec, {
        planTier: res.headers.get("X-Figma-Plan-Tier"),
        limitType: res.headers.get("X-Figma-Rate-Limit-Type"),
      }),
      429,
    );
  }

  return res;
}

async function parseFigmaResponse(res: Response): Promise<unknown> {
  if (res.status === 403 || res.status === 404) {
    throw new FigmaApiError(
      "Cannot access file — check permissions",
      res.status,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new FigmaApiError(
      body
        ? `Figma API error (${res.status}): ${body.slice(0, 200)}`
        : `Figma API error (${res.status})`,
      res.status,
    );
  }

  return res.json();
}

async function fetchFigmaFileMeta(
  fileKey: string,
  token: string,
): Promise<FigmaFileMetaResult> {
  const url = `${FIGMA_API_BASE}/files/${fileKey}/meta`;

  let res: Response;
  try {
    res = await figmaFetch(url, token);
  } catch (err) {
    if (err instanceof FigmaApiError && err.status === 429) {
      return { status: "rate_limited" };
    }
    throw err;
  }

  if (res.status === 403) {
    return { status: "forbidden" };
  }

  if (res.status === 404) {
    throw new FigmaApiError(
      "Cannot access file — check permissions",
      res.status,
    );
  }

  if (!res.ok) {
    return { status: "error" };
  }

  const body = (await res.json()) as { file?: FigmaFileMeta };
  const version = body.file?.version;
  return typeof version === "string"
    ? { status: "ok", version }
    : { status: "error" };
}

async function fetchFullFigmaTree(
  fileKey: string,
  nodeId: string | null,
  token: string,
): Promise<{ data: unknown; meta: { version: string; lastModified: string } }> {
  const url = buildFigmaTreeUrl(fileKey, nodeId);
  const data = await parseFigmaResponse(await figmaFetch(url, token));
  return { data, meta: extractFigmaFileMeta(data) };
}

function toCacheInfo(
  entry: FigmaTreeCacheEntry,
  hit: boolean,
): FetchFigmaTreeCacheInfo {
  return {
    hit,
    validatedAt: new Date().toISOString(),
    fetchedAt: new Date(entry.fetchedAt).toISOString(),
  };
}

function serveCachedTree(entry: FigmaTreeCacheEntry): FetchFigmaTreeResult {
  return {
    data: entry.data,
    source: "cache",
    cache: toCacheInfo(entry, true),
  };
}

async function resolveCachedTree(
  fileKey: string,
  token: string,
  cached: FigmaTreeCacheEntry,
): Promise<FetchFigmaTreeResult | null> {
  if (isCacheFresh(cached)) {
    return serveCachedTree(cached);
  }

  const meta = await fetchFigmaFileMeta(fileKey, token);

  switch (meta.status) {
    case "ok":
      return meta.version === cached.version ? serveCachedTree(cached) : null;
    case "forbidden":
    case "rate_limited":
      return serveCachedTree(cached);
    case "error":
      return null;
  }
}

export async function fetchFigmaTree(
  fileKey: string,
  nodeId: string | null,
  options: FetchFigmaTreeOptions = {},
): Promise<FetchFigmaTreeResult | null> {
  const token = process.env.FIGMA_ACCESS_TOKEN?.trim();
  if (!token) {
    return null;
  }

  const cacheEnabled = isFigmaCacheEnabled();
  const cacheKey = buildFigmaCacheKey(fileKey, nodeId);
  const cached =
    cacheEnabled && !options.forceRefresh
      ? getFigmaTreeCache(cacheKey)
      : null;

  if (cached) {
    const cachedResult = await resolveCachedTree(fileKey, token, cached);
    if (cachedResult) {
      return cachedResult;
    }
  }

  try {
    const { data, meta } = await fetchFullFigmaTree(fileKey, nodeId, token);

    if (cacheEnabled && meta.version) {
      const entry: FigmaTreeCacheEntry = {
        fileKey,
        nodeId,
        version: meta.version,
        lastModified: meta.lastModified,
        data,
        fetchedAt: Date.now(),
      };
      setFigmaTreeCache(cacheKey, entry);

      return {
        data,
        source: "api",
        cache: toCacheInfo(entry, false),
      };
    }

    return { data, source: "api" };
  } catch (err) {
    if (
      cacheEnabled &&
      err instanceof FigmaApiError &&
      err.status === 429
    ) {
      const stale = peekFigmaTreeCache(cacheKey);
      if (stale) {
        return serveCachedTree(stale);
      }
    }
    throw err;
  }
}
