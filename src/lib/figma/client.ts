import {
  buildFigmaCacheKey,
  getFigmaTreeCache,
  isCacheFresh,
  isFigmaCacheEnabled,
  peekFigmaTreeCache,
  setFigmaTreeCache,
  type FigmaTreeCacheEntry,
} from "@/lib/figma/cache";
import { ensureFigmaMockServer } from "@/mocks/ensure-server";
import { FigmaApiError, figmaFetch, parseFigmaResponse } from "@/lib/figma/fetch";
import {
  rateLimitLogFields,
  type FigmaRateLimitDetails,
} from "@/lib/figma/retry-after";
import type { FigmaDataSource } from "@/lib/types";

export { FigmaApiError } from "@/lib/figma/fetch";

const FIGMA_API_BASE = "https://api.figma.com/v1";

/**
 * Fetches a node subtree when `nodeId` is set; otherwise file metadata + shallow tree.
 * Skips the request when `FIGMA_ACCESS_TOKEN` is unset.
 * Uses an in-memory version-aware cache when enabled (see FIGMA_CACHE_* env vars).
 * @see https://www.figma.com/developers/api#get-file-nodes-endpoint
 * @see https://www.figma.com/developers/api#get-files-endpoint
 */
export interface FetchFigmaTreeCacheInfo {
  hit: boolean;
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
  | { status: "rate_limited"; rateLimit: FigmaRateLimitDetails }
  | { status: "error" };

function logTree(event: string, details?: Record<string, unknown>): void {
  console.log("[figma-tree-cache]", event, details ?? "");
}

function extractVersion(data: unknown): string {
  if (typeof data !== "object" || data === null) {
    return "";
  }

  const version = (data as Record<string, unknown>).version;
  return typeof version === "string" ? version : "";
}

function buildFigmaTreeUrl(fileKey: string, nodeId: string | null): string {
  return nodeId
    ? `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`
    : `${FIGMA_API_BASE}/files/${fileKey}?depth=2`;
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
      return {
        status: "rate_limited",
        rateLimit: err.rateLimit ?? {
          retryAfterSec: 60,
          planTier: null,
          rateLimitType: null,
          upgradeLink: null,
        },
      };
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
): Promise<{ data: unknown; version: string }> {
  const url = buildFigmaTreeUrl(fileKey, nodeId);
  const data = await parseFigmaResponse(await figmaFetch(url, token));
  return { data, version: extractVersion(data) };
}

function toCacheInfo(
  entry: FigmaTreeCacheEntry,
  hit: boolean,
): FetchFigmaTreeCacheInfo {
  return {
    hit,
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
    logTree("serve", {
      fileKey,
      nodeId: cached.nodeId,
      reason: "fresh_window",
      version: cached.version,
    });
    return serveCachedTree(cached);
  }

  const meta = await fetchFigmaFileMeta(fileKey, token);

  switch (meta.status) {
    case "ok":
      if (meta.version === cached.version) {
        logTree("serve", {
          fileKey,
          nodeId: cached.nodeId,
          reason: "meta_version_match",
          version: cached.version,
        });
        return serveCachedTree(cached);
      }
      logTree("stale", {
        fileKey,
        nodeId: cached.nodeId,
        reason: "meta_version_mismatch",
        cachedVersion: cached.version,
        remoteVersion: meta.version,
      });
      return null;
    case "forbidden":
      logTree("serve", {
        fileKey,
        nodeId: cached.nodeId,
        reason: "meta_forbidden",
        version: cached.version,
      });
      return serveCachedTree(cached);
    case "rate_limited":
      logTree("serve", {
        fileKey,
        nodeId: cached.nodeId,
        reason: "meta_rate_limited",
        version: cached.version,
        ...rateLimitLogFields(meta.rateLimit),
      });
      return serveCachedTree(cached);
    case "error":
      logTree("stale", {
        fileKey,
        nodeId: cached.nodeId,
        reason: "meta_error",
        cachedVersion: cached.version,
      });
      return null;
  }
}

export interface FetchFigmaTreeOptions {
  figmaAccessToken?: string;
}

export async function fetchFigmaTree(
  fileKey: string,
  nodeId: string | null,
  options: FetchFigmaTreeOptions = {},
): Promise<FetchFigmaTreeResult | null> {
  await ensureFigmaMockServer();

  const token =
    options.figmaAccessToken?.trim() ||
    process.env.FIGMA_ACCESS_TOKEN?.trim();
  if (!token) {
    return null;
  }

  const cacheEnabled = isFigmaCacheEnabled();
  const cacheKey = buildFigmaCacheKey(fileKey, nodeId);
  const cached = cacheEnabled ? getFigmaTreeCache(cacheKey) : null;

  if (cached) {
    const cachedResult = await resolveCachedTree(fileKey, token, cached);
    if (cachedResult) {
      return cachedResult;
    }
  } else if (cacheEnabled) {
    logTree("miss", { cacheKey, fileKey, nodeId });
  }

  logTree("api_fetch", {
    fileKey,
    nodeId,
    cacheKey,
    endpoint: nodeId ? "nodes" : "file",
  });

  try {
    const { data, version } = await fetchFullFigmaTree(fileKey, nodeId, token);

    if (cacheEnabled && version) {
      const entry: FigmaTreeCacheEntry = {
        fileKey,
        nodeId,
        version,
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

    if (cacheEnabled && !version) {
      logTree("store_skipped", {
        cacheKey,
        fileKey,
        nodeId,
        reason: "missing_version",
      });
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
        logTree("serve", {
          fileKey,
          nodeId: stale.nodeId,
          reason: "rate_limited_stale",
          version: stale.version,
          ...rateLimitLogFields(err.rateLimit),
        });
        return serveCachedTree(stale);
      }
      logTree("rate_limited_no_stale", {
        cacheKey,
        fileKey,
        nodeId,
        ...rateLimitLogFields(err.rateLimit),
      });
    }
    throw err;
  }
}
