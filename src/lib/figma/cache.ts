import { isFigmaApiMockEnabled } from "@/lib/figma/mock-enabled";

export interface FigmaTreeCacheEntry {
  fileKey: string;
  nodeId: string | null;
  version: string;
  data: unknown;
  fetchedAt: number;
}

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const DEFAULT_FRESH_MS = 30 * 1000;
const DEFAULT_MAX_ENTRIES = 50;

const store = new Map<string, FigmaTreeCacheEntry>();

function logStore(event: string, details?: Record<string, unknown>): void {
  console.log("[figma-tree-cache]", event, details ?? "");
}

/** Cache key for a file or node subtree fetch (must match query params used in client). */
export function buildFigmaCacheKey(
  fileKey: string,
  nodeId: string | null,
): string {
  return `${fileKey}:${nodeId ?? "_file"}:depth=2`;
}

/** When false, every scan hits the Figma REST API. Default: true. */
export function isFigmaCacheEnabled(): boolean {
  if (isFigmaApiMockEnabled()) {
    return false;
  }

  const flag = process.env.FIGMA_CACHE_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") {
    return false;
  }
  return true;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) {
    return fallback;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getCacheTtlMs(): number {
  return parsePositiveInt(process.env.FIGMA_CACHE_TTL_MS, DEFAULT_TTL_MS);
}

function getCacheMaxEntries(): number {
  return parsePositiveInt(
    process.env.FIGMA_CACHE_MAX_ENTRIES,
    DEFAULT_MAX_ENTRIES,
  );
}

/** Skip /meta validation when the tree was fetched within this window (instant re-scans). */
function getCacheFreshMs(): number {
  const raw = process.env.FIGMA_CACHE_FRESH_MS?.trim();
  if (!raw) {
    return DEFAULT_FRESH_MS;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_FRESH_MS;
}

export function isCacheFresh(entry: FigmaTreeCacheEntry): boolean {
  const freshMs = getCacheFreshMs();
  if (freshMs === 0) {
    return false;
  }
  return Date.now() - entry.fetchedAt < freshMs;
}

function isExpired(entry: FigmaTreeCacheEntry): boolean {
  return Date.now() - entry.fetchedAt > getCacheTtlMs();
}

/** Returns a non-expired entry, or null on miss/expiry. Refreshes LRU order on hit. */
export function getFigmaTreeCache(key: string): FigmaTreeCacheEntry | null {
  const entry = store.get(key);
  if (!entry || isExpired(entry)) {
    return null;
  }

  store.delete(key);
  store.set(key, entry);
  return entry;
}

export function setFigmaTreeCache(
  key: string,
  entry: FigmaTreeCacheEntry,
): void {
  const isUpdate = store.has(key);
  if (isUpdate) {
    store.delete(key);
  }
  store.set(key, entry);

  logStore("upsert", {
    key,
    action: isUpdate ? "update" : "insert",
    fileKey: entry.fileKey,
    nodeId: entry.nodeId,
    version: entry.version,
    storeSize: store.size,
  });

  const maxEntries = getCacheMaxEntries();
  while (store.size > maxEntries) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    store.delete(oldest);
    logStore("lru_evict", {
      evictedKey: oldest,
      maxEntries,
      storeSize: store.size,
    });
  }
}

/** Returns any stored entry, including expired (for 429 fallback only). */
export function peekFigmaTreeCache(key: string): FigmaTreeCacheEntry | null {
  return store.get(key) ?? null;
}

/** Clears in-memory cache (for tests). */
export function clearFigmaTreeCache(): void {
  store.clear();
}
