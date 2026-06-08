import { isFigmaApiMockEnabled } from "@/lib/figma/mock-enabled";
import type { FigmaNode } from "@/lib/figma/node";
import { extractFigmaDocuments, isFigmaNode } from "@/lib/figma/tree";
import { Redis } from "@upstash/redis";

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

const FIGMA_ROOTS_KEY = (fileKey: string) => `figma:roots:${fileKey}`;
const FIGMA_FLAT_KEY = (fileKey: string) => `figma:flat:${fileKey}`;

interface NodeCacheBackend {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options: { ex: number }): Promise<void>;
  del(...keys: string[]): Promise<void>;
}

/** In-memory backend for vitest and environments without Upstash credentials. */
class MemoryNodeCache implements NodeCacheBackend {
  private entries = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(
    key: string,
    value: unknown,
    options: { ex: number },
  ): Promise<void> {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + options.ex * 1000,
    });
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) {
      this.entries.delete(key);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}

function hasUpstashCredentials(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

function createNodeCacheBackend(): NodeCacheBackend {
  // In-memory only for vitest or when Upstash is not configured.
  // FIGMA_API_MOCK does not affect this — mock only swaps the Figma API source.
  if (process.env.VITEST === "true" || !hasUpstashCredentials()) {
    return new MemoryNodeCache();
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    // @upstash/redis passes `keepalive` to fetch by default; Next.js patched
    // fetch rejects that option on non-GET requests (TypeError: keepalive).
    keepAlive: false,
  });

  return {
    get: (key) => redis.get(key),
    set: async (key, value, options) => {
      await redis.set(key, value, options);
    },
    del: async (...keys) => {
      await redis.del(...keys);
    },
  };
}

const nodeCache = createNodeCacheBackend();
const memoryNodeCache = nodeCache instanceof MemoryNodeCache ? nodeCache : null;

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

function getNodeCacheTtlSeconds(): number {
  return Math.max(1, Math.ceil(getCacheTtlMs() / 1000));
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

/** Clears API tree cache and indexed node cache (for tests). */
export function clearFigmaTreeCache(): void {
  store.clear();
  memoryNodeCache?.clear();
}

function flattenIntoMap(
  node: FigmaNode,
  flatMap: Record<string, FigmaNode>,
): void {
  flatMap[node.id] = node;
  for (const child of node.children ?? []) {
    flattenIntoMap(child, flatMap);
  }
}

/**
 * Public function to prime the flat registry cache when an audit runs.
 * Accepts raw Figma API payloads (`unknown`), a document wrapper with
 * `children`, or a single {@link FigmaNode} root.
 */
export async function indexFigmaTreeNodes(
  fileKey: string,
  rootTreeData: unknown,
): Promise<void> {
  if (rootTreeData == null) {
    return;
  }

  const roots: FigmaNode[] = [];
  const flatMap: Record<string, FigmaNode> = {};

  const documents = extractFigmaDocuments(rootTreeData);
  if (documents.length > 0) {
    for (const doc of documents) {
      flattenIntoMap(doc, flatMap);
      roots.push(doc);
    }
  } else if (typeof rootTreeData === "object") {
    if (isFigmaNode(rootTreeData)) {
      flattenIntoMap(rootTreeData, flatMap);
      roots.push(rootTreeData);
    } else {
      const record = rootTreeData as Record<string, unknown>;
      if (Array.isArray(record.children)) {
        for (const child of record.children) {
          if (isFigmaNode(child)) {
            flattenIntoMap(child, flatMap);
            roots.push(child);
          }
        }
      }
    }
  }

  if (roots.length === 0) {
    return;
  }

  const ttl = { ex: getNodeCacheTtlSeconds() };
  await nodeCache.set(FIGMA_ROOTS_KEY(fileKey), roots, ttl);
  await nodeCache.set(FIGMA_FLAT_KEY(fileKey), flatMap, ttl);
}

/**
 * Retrieves the full flat node map for a file. Returns null if the file
 * has not been indexed yet.
 */
export async function getTreeFromCache(
  fileKey: string,
): Promise<Map<string, FigmaNode> | null> {
  const flatMap = await nodeCache.get<Record<string, FigmaNode>>(
    FIGMA_FLAT_KEY(fileKey),
  );
  if (!flatMap) {
    return null;
  }
  return new Map(Object.entries(flatMap));
}

/**
 * Returns the root FigmaNode[] that were indexed for a file, preserving
 * their full child trees. Ready for direct use with `runAllAudits`.
 * Returns null if the file has not been indexed.
 */
export async function getRootNodesFromCache(
  fileKey: string,
): Promise<FigmaNode[] | null> {
  const roots = await nodeCache.get<FigmaNode[]>(FIGMA_ROOTS_KEY(fileKey));
  return roots && roots.length > 0 ? roots : null;
}

/**
 * Instant O(1) property extraction function for your ReAct tool.
 */
export async function getIndexedNode(
  fileKey: string,
  nodeId: string,
): Promise<FigmaNode | null> {
  const flatMap = await nodeCache.get<Record<string, FigmaNode>>(
    FIGMA_FLAT_KEY(fileKey),
  );
  return flatMap?.[nodeId] ?? null;
}
