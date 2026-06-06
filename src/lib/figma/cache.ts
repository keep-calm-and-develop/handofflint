import { isFigmaApiMockEnabled } from "@/lib/figma/mock-enabled";
import type { FigmaNode } from "@/lib/figma/node";
import { extractFigmaDocuments, isFigmaNode } from "@/lib/figma/tree";

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

const nodeRegistry = new Map<string, Map<string, FigmaNode>>();
const rootNodeIds = new Map<string, string[]>();

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
  nodeRegistry.clear();
  rootNodeIds.clear();
}

function getOrCreateFileMap(fileKey: string): Map<string, FigmaNode> {
  let fileMap = nodeRegistry.get(fileKey);
  if (!fileMap) {
    fileMap = new Map<string, FigmaNode>();
    nodeRegistry.set(fileKey, fileMap);
  }
  return fileMap;
}

/**
 * Recursively walks a nested Figma tree to index every node by its ID.
 */
function flattenAndIndexNode(fileKey: string, node: FigmaNode): void {
  getOrCreateFileMap(fileKey).set(node.id, node);

  for (const child of node.children ?? []) {
    flattenAndIndexNode(fileKey, child);
  }
}

/**
 * Public function to prime the flat registry cache when an audit runs.
 * Accepts raw Figma API payloads (`unknown`), a document wrapper with
 * `children`, or a single {@link FigmaNode} root.
 */
export function indexFigmaTreeNodes(
  fileKey: string,
  rootTreeData: unknown,
): void {
  if (rootTreeData == null) {
    return;
  }

  const roots: string[] = [];

  const documents = extractFigmaDocuments(rootTreeData);
  if (documents.length > 0) {
    for (const doc of documents) {
      flattenAndIndexNode(fileKey, doc);
      roots.push(doc.id);
    }
    rootNodeIds.set(fileKey, roots);
    return;
  }

  if (typeof rootTreeData !== "object") {
    return;
  }

  if (isFigmaNode(rootTreeData)) {
    flattenAndIndexNode(fileKey, rootTreeData);
    roots.push(rootTreeData.id);
    rootNodeIds.set(fileKey, roots);
    return;
  }

  // Non-FigmaNode object with a children array (e.g. a raw document wrapper
  // without id/name/type that just holds page subtrees).
  const record = rootTreeData as Record<string, unknown>;
  if (Array.isArray(record.children)) {
    for (const child of record.children) {
      if (isFigmaNode(child)) {
        flattenAndIndexNode(fileKey, child);
        roots.push(child.id);
      }
    }
  }

  if (roots.length > 0) {
    rootNodeIds.set(fileKey, roots);
  }
}

/**
 * Retrieves the full flat node map for a file. Returns null if the file
 * has not been indexed yet.
 */
export function getTreeFromCache(
  fileKey: string,
): Map<string, FigmaNode> | null {
  return nodeRegistry.get(fileKey) ?? null;
}

/**
 * Returns the root FigmaNode[] that were indexed for a file, preserving
 * their full child trees. Ready for direct use with `runAllAudits`.
 * Returns null if the file has not been indexed.
 */
export function getRootNodesFromCache(fileKey: string): FigmaNode[] | null {
  const ids = rootNodeIds.get(fileKey);
  if (!ids || ids.length === 0) {
    return null;
  }
  const fileMap = nodeRegistry.get(fileKey);
  if (!fileMap) {
    return null;
  }
  const roots = ids.map((id) => fileMap.get(id)).filter((n): n is FigmaNode => n != null);
  return roots.length > 0 ? roots : null;
}

/**
 * Instant O(1) property extraction function for your ReAct tool.
 */
export function getIndexedNode(
  fileKey: string,
  nodeId: string,
): FigmaNode | null {
  return nodeRegistry.get(fileKey)?.get(nodeId) ?? null;
}
