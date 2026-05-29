import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchFigmaTree } from "@/lib/figma/client";
import { clearFigmaTreeCache } from "@/lib/figma/cache";

const FILE_KEY = "test-file-key";
const NODE_ID = "1:4";

function treePayload(version: string) {
  return {
    name: "Test file",
    version,
    lastModified: "2026-05-27T12:47:17Z",
    document: { id: "0:1", type: "DOCUMENT", children: [] },
  };
}

function metaPayload(version: string) {
  return {
    file: {
      version,
      last_touched_at: "2026-05-27T12:47:17Z",
    },
  };
}

describe("fetchFigmaTree", () => {
  beforeEach(() => {
    vi.stubEnv("FIGMA_ACCESS_TOKEN", "test-token");
    vi.stubEnv("FIGMA_CACHE_ENABLED", "true");
    vi.stubEnv("FIGMA_CACHE_FRESH_MS", "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    clearFigmaTreeCache();
  });

  it("returns null when FIGMA_ACCESS_TOKEN is not set", async () => {
    vi.stubEnv("FIGMA_ACCESS_TOKEN", "");

    const result = await fetchFigmaTree("any-file-key", "1:4");
    expect(result).toBeNull();
  });

  it("fetches from API on first request and stores cache metadata", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/meta")) {
        return new Response(JSON.stringify(metaPayload("v1")), { status: 200 });
      }
      return new Response(JSON.stringify(treePayload("v1")), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFigmaTree(FILE_KEY, null);

    expect(result?.source).toBe("api");
    expect(result?.cache?.hit).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      `/files/${FILE_KEY}?depth=2`,
    );
  });

  it("serves cached tree when meta version is unchanged", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/meta")) {
        return new Response(JSON.stringify(metaPayload("v1")), { status: 200 });
      }
      return new Response(JSON.stringify(treePayload("v1")), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFigmaTree(FILE_KEY, NODE_ID);
    fetchMock.mockClear();

    const result = await fetchFigmaTree(FILE_KEY, NODE_ID);

    expect(result?.source).toBe("cache");
    expect(result?.cache?.hit).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(`/files/${FILE_KEY}/meta`);
  });

  it("refetches tree when meta version changes", async () => {
    let metaVersion = "v1";
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/meta")) {
        return new Response(JSON.stringify(metaPayload(metaVersion)), {
          status: 200,
        });
      }
      return new Response(JSON.stringify(treePayload(metaVersion)), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFigmaTree(FILE_KEY, null);

    metaVersion = "v2";
    fetchMock.mockClear();

    const result = await fetchFigmaTree(FILE_KEY, null);

    expect(result?.source).toBe("api");
    expect(result?.cache?.hit).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.some(([u]) => u.includes("/meta"))).toBe(true);
    expect(fetchMock.mock.calls.some(([u]) => u.includes("?depth=2"))).toBe(
      true,
    );
  });

  it("bypasses cache read when forceRefresh is true", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/meta")) {
        return new Response(JSON.stringify(metaPayload("v1")), { status: 200 });
      }
      return new Response(JSON.stringify(treePayload("v1")), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFigmaTree(FILE_KEY, null);
    fetchMock.mockClear();

    const result = await fetchFigmaTree(FILE_KEY, null, { forceRefresh: true });

    expect(result?.source).toBe("api");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(`?depth=2`);
  });

  it("serves cached tree when meta is unavailable (TTL-only fallback)", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/meta")) {
        return new Response("forbidden", { status: 403 });
      }
      return new Response(JSON.stringify(treePayload("v1")), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFigmaTree(FILE_KEY, null);
    fetchMock.mockClear();

    const result = await fetchFigmaTree(FILE_KEY, null);

    expect(result?.source).toBe("cache");
    expect(result?.cache?.hit).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(`/files/${FILE_KEY}/meta`);
  });

  it("skips meta when cache entry is still fresh", async () => {
    vi.stubEnv("FIGMA_CACHE_FRESH_MS", "60000");

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/meta")) {
        return new Response(JSON.stringify(metaPayload("v1")), { status: 200 });
      }
      return new Response(JSON.stringify(treePayload("v1")), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFigmaTree(FILE_KEY, null);
    fetchMock.mockClear();

    const result = await fetchFigmaTree(FILE_KEY, null);

    expect(result?.source).toBe("cache");
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it("refetches when meta fails with a server error", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/meta")) {
        return new Response("error", { status: 500 });
      }
      return new Response(JSON.stringify(treePayload("v1")), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFigmaTree(FILE_KEY, null);
    fetchMock.mockClear();

    const result = await fetchFigmaTree(FILE_KEY, null);

    expect(result?.source).toBe("api");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.some(([u]) => u.includes("/meta"))).toBe(true);
    expect(fetchMock.mock.calls.some(([u]) => u.includes("?depth=2"))).toBe(
      true,
    );
  });

  it("serves cached tree when meta is rate limited", async () => {
    vi.stubEnv("FIGMA_CACHE_FRESH_MS", "0");

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/meta")) {
        return new Response("rate limited", {
          status: 429,
          headers: { "Retry-After": "60" },
        });
      }
      return new Response(JSON.stringify(treePayload("v1")), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFigmaTree(FILE_KEY, null);
    fetchMock.mockClear();

    const result = await fetchFigmaTree(FILE_KEY, null);

    expect(result?.source).toBe("cache");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(`/files/${FILE_KEY}/meta`);
  });

  it("throws on rate limit when no cache exists", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "30" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFigmaTree(FILE_KEY, null)).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining("try again in 30 seconds"),
    });
  });

  it("serves stale cache when full fetch is rate limited", async () => {
    vi.stubEnv("FIGMA_CACHE_FRESH_MS", "0");

    let rateLimited = false;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/meta")) {
        return new Response(JSON.stringify(metaPayload("v2")), { status: 200 });
      }
      if (!rateLimited) {
        return new Response(JSON.stringify(treePayload("v1")), { status: 200 });
      }
      return new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "3600" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFigmaTree(FILE_KEY, null);

    rateLimited = true;
    fetchMock.mockClear();

    const result = await fetchFigmaTree(FILE_KEY, null);

    expect(result?.source).toBe("cache");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
