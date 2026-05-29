import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildFigmaCacheKey,
  clearFigmaTreeCache,
  getFigmaTreeCache,
  isCacheFresh,
  setFigmaTreeCache,
} from "@/lib/figma/cache";

describe("figma cache", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearFigmaTreeCache();
  });

  it("builds a distinct key per file and node scope", () => {
    expect(buildFigmaCacheKey("abc", null)).toBe("abc:_file:depth=2");
    expect(buildFigmaCacheKey("abc", "1:4")).toBe("abc:1:4:depth=2");
  });

  it("returns stored entries and refreshes LRU order on hit", () => {
    const entry = {
      fileKey: "file-a",
      nodeId: null,
      version: "v1",
      lastModified: "2026-01-01T00:00:00Z",
      data: { name: "A" },
      fetchedAt: Date.now(),
    };

    setFigmaTreeCache("file-a:_file:depth=2", entry);
    expect(getFigmaTreeCache("file-a:_file:depth=2")).toEqual(entry);
  });

  it("expires entries past TTL", () => {
    vi.stubEnv("FIGMA_CACHE_TTL_MS", "1000");

    const key = "file-a:_file:depth=2";
    setFigmaTreeCache(key, {
      fileKey: "file-a",
      nodeId: null,
      version: "v1",
      lastModified: "2026-01-01T00:00:00Z",
      data: {},
      fetchedAt: Date.now() - 2000,
    });

    expect(getFigmaTreeCache(key)).toBeNull();
  });

  it("treats entries within fresh window as fresh", () => {
    vi.stubEnv("FIGMA_CACHE_FRESH_MS", "5000");

    expect(
      isCacheFresh({
        fileKey: "file-a",
        nodeId: null,
        version: "v1",
        lastModified: "2026-01-01T00:00:00Z",
        data: {},
        fetchedAt: Date.now() - 1000,
      }),
    ).toBe(true);

    expect(
      isCacheFresh({
        fileKey: "file-a",
        nodeId: null,
        version: "v1",
        lastModified: "2026-01-01T00:00:00Z",
        data: {},
        fetchedAt: Date.now() - 6000,
      }),
    ).toBe(false);
  });

  it("evicts oldest entry when max entries exceeded", () => {
    vi.stubEnv("FIGMA_CACHE_MAX_ENTRIES", "2");

    const makeEntry = (fileKey: string) => ({
      fileKey,
      nodeId: null,
      version: "v1",
      lastModified: "2026-01-01T00:00:00Z",
      data: {},
      fetchedAt: Date.now(),
    });

    setFigmaTreeCache("a:_file:depth=2", makeEntry("a"));
    setFigmaTreeCache("b:_file:depth=2", makeEntry("b"));
    setFigmaTreeCache("c:_file:depth=2", makeEntry("c"));

    expect(getFigmaTreeCache("a:_file:depth=2")).toBeNull();
    expect(getFigmaTreeCache("b:_file:depth=2")).toBeTruthy();
    expect(getFigmaTreeCache("c:_file:depth=2")).toBeTruthy();
  });
});
