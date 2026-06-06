import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildFigmaCacheKey,
  clearFigmaTreeCache,
  getFigmaTreeCache,
  getIndexedNode,
  getRootNodesFromCache,
  getTreeFromCache,
  isCacheFresh,
  indexFigmaTreeNodes,
  setFigmaTreeCache,
} from "@/lib/figma/cache";
import type { FigmaNode } from "@/lib/figma/node";

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
        data: {},
        fetchedAt: Date.now() - 1000,
      }),
    ).toBe(true);

    expect(
      isCacheFresh({
        fileKey: "file-a",
        nodeId: null,
        version: "v1",
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

describe("node registry (indexFigmaTreeNodes / getIndexedNode / getTreeFromCache)", () => {
  afterEach(() => {
    clearFigmaTreeCache();
  });

  const frame: FigmaNode = {
    id: "1:1",
    name: "Frame",
    type: "FRAME",
    children: [
      { id: "1:2", name: "Button", type: "INSTANCE", componentId: "c1" },
      {
        id: "1:3",
        name: "Text",
        type: "TEXT",
        characters: "Hello",
        children: [],
      },
    ],
  };

  it("indexes a single FigmaNode root and retrieves by nodeId", () => {
    indexFigmaTreeNodes("file-x", frame);

    expect(getIndexedNode("file-x", "1:1")).toBe(frame);
    expect(getIndexedNode("file-x", "1:2")).toBe(frame.children![0]);
    expect(getIndexedNode("file-x", "1:3")).toBe(frame.children![1]);
  });

  it("returns null for unknown file or node", () => {
    indexFigmaTreeNodes("file-x", frame);

    expect(getIndexedNode("file-x", "99:99")).toBeNull();
    expect(getIndexedNode("unknown-file", "1:1")).toBeNull();
  });

  it("getTreeFromCache returns the full flat map for an indexed file", () => {
    indexFigmaTreeNodes("file-x", frame);

    const map = getTreeFromCache("file-x");
    expect(map).not.toBeNull();
    expect(map!.size).toBe(3);
    expect(map!.get("1:1")).toBe(frame);
    expect(map!.get("1:2")).toBe(frame.children![0]);
    expect(map!.get("1:3")).toBe(frame.children![1]);
  });

  it("getTreeFromCache returns null for a file not yet indexed", () => {
    expect(getTreeFromCache("never-indexed")).toBeNull();
  });

  it("indexes a full Figma file API response (document wrapper)", () => {
    const apiResponse = {
      document: {
        id: "0:0",
        name: "Document",
        type: "DOCUMENT",
        children: [frame],
      },
      schemaVersion: 0,
      version: "v1",
    };

    indexFigmaTreeNodes("file-y", apiResponse);

    expect(getIndexedNode("file-y", "0:0")).not.toBeNull();
    expect(getIndexedNode("file-y", "1:1")).toBe(frame);
    expect(getIndexedNode("file-y", "1:2")).toBe(frame.children![0]);
  });

  it("indexes a file-nodes API response (nodes wrapper)", () => {
    const nodesResponse = {
      nodes: {
        "1:1": {
          document: frame,
        },
      },
    };

    indexFigmaTreeNodes("file-z", nodesResponse);

    expect(getIndexedNode("file-z", "1:1")).toBe(frame);
    expect(getIndexedNode("file-z", "1:3")).toBe(frame.children![1]);
  });

  it("clearFigmaTreeCache clears the node registry", () => {
    indexFigmaTreeNodes("file-x", frame);
    expect(getTreeFromCache("file-x")).not.toBeNull();

    clearFigmaTreeCache();

    expect(getTreeFromCache("file-x")).toBeNull();
    expect(getIndexedNode("file-x", "1:1")).toBeNull();
  });

  it("handles null/undefined rootTreeData gracefully", () => {
    indexFigmaTreeNodes("file-x", null);
    indexFigmaTreeNodes("file-x", undefined);

    expect(getTreeFromCache("file-x")).toBeNull();
  });

  it("keeps separate maps per fileKey", () => {
    const otherFrame: FigmaNode = {
      id: "2:1",
      name: "Other",
      type: "FRAME",
    };

    indexFigmaTreeNodes("file-a", frame);
    indexFigmaTreeNodes("file-b", otherFrame);

    expect(getTreeFromCache("file-a")!.size).toBe(3);
    expect(getTreeFromCache("file-b")!.size).toBe(1);
    expect(getIndexedNode("file-a", "2:1")).toBeNull();
    expect(getIndexedNode("file-b", "1:1")).toBeNull();
  });
});

describe("getRootNodesFromCache", () => {
  afterEach(() => {
    clearFigmaTreeCache();
  });

  const frame: FigmaNode = {
    id: "1:1",
    name: "Frame",
    type: "FRAME",
    children: [
      { id: "1:2", name: "Button", type: "INSTANCE", componentId: "c1" },
      { id: "1:3", name: "Text", type: "TEXT", characters: "Hello" },
    ],
  };

  it("returns root nodes for a single FigmaNode root", () => {
    indexFigmaTreeNodes("file-x", frame);

    const roots = getRootNodesFromCache("file-x");
    expect(roots).not.toBeNull();
    expect(roots).toHaveLength(1);
    expect(roots![0]).toBe(frame);
    expect(roots![0].children).toHaveLength(2);
  });

  it("returns root nodes for a document wrapper response", () => {
    const apiResponse = {
      document: {
        id: "0:0",
        name: "Document",
        type: "DOCUMENT",
        children: [frame],
      },
      version: "v1",
    };

    indexFigmaTreeNodes("file-y", apiResponse);

    const roots = getRootNodesFromCache("file-y");
    expect(roots).not.toBeNull();
    expect(roots).toHaveLength(1);
    expect(roots![0].id).toBe("0:0");
    expect(roots![0].type).toBe("DOCUMENT");
  });

  it("returns root nodes for a file-nodes API response", () => {
    const nodesResponse = {
      nodes: { "1:1": { document: frame } },
    };

    indexFigmaTreeNodes("file-z", nodesResponse);

    const roots = getRootNodesFromCache("file-z");
    expect(roots).not.toBeNull();
    expect(roots).toHaveLength(1);
    expect(roots![0]).toBe(frame);
  });

  it("returns null for a file not yet indexed", () => {
    expect(getRootNodesFromCache("unknown")).toBeNull();
  });

  it("returns null after cache is cleared", () => {
    indexFigmaTreeNodes("file-x", frame);
    clearFigmaTreeCache();

    expect(getRootNodesFromCache("file-x")).toBeNull();
  });
});
