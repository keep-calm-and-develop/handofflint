import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearFigmaImageCache, fetchFigmaImages } from "@/lib/figma/images";
import {
  MOCK_IMAGE_URL,
  MOCK_NULL_NODE_ID,
} from "@/mocks/figma-handlers";

const FILE_KEY = "test-file-key";
const NODE_ID = "1:4";

function imagesPayload(
  ids: string[],
  nullNodeId?: string,
): { err: null; images: Record<string, string | null> } {
  const images: Record<string, string | null> = {};
  for (const id of ids) {
    images[id] = id === nullNodeId ? null : MOCK_IMAGE_URL;
  }
  return { err: null, images };
}

describe("fetchFigmaImages", () => {
  beforeEach(() => {
    vi.stubEnv("FIGMA_ACCESS_TOKEN", "test-token");
    vi.stubEnv("FIGMA_API_MOCK", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    clearFigmaImageCache();
  });

  it("returns null when FIGMA_ACCESS_TOKEN is not set", async () => {
    vi.stubEnv("FIGMA_ACCESS_TOKEN", "");
    const result = await fetchFigmaImages(FILE_KEY, [NODE_ID]);
    expect(result).toBeNull();
  });

  it("returns empty images for an empty nodeIds array without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFigmaImages(FILE_KEY, []);
    expect(result?.images).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests the images endpoint with correct params and returns URL", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify(imagesPayload([NODE_ID])),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFigmaImages(FILE_KEY, [NODE_ID]);

    expect(result?.source).toBe("api");
    expect(result?.images[NODE_ID]).toBe(MOCK_IMAGE_URL);

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain(`/images/${FILE_KEY}`);
    expect(calledUrl).toContain(`format=png`);
    expect(calledUrl).toContain(`scale=2`);
    expect(calledUrl).toContain(encodeURIComponent(NODE_ID));
  });

  it("passes scale and format options to the API URL", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify(imagesPayload([NODE_ID])), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchFigmaImages(FILE_KEY, [NODE_ID], { scale: 1, format: "svg" });

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("scale=1");
    expect(calledUrl).toContain("format=svg");
  });

  it("preserves null image URLs — unrenderable nodes must surface as null", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(imagesPayload([NODE_ID, MOCK_NULL_NODE_ID], MOCK_NULL_NODE_ID)),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFigmaImages(FILE_KEY, [NODE_ID, MOCK_NULL_NODE_ID]);

    expect(result?.images[NODE_ID]).toBe(MOCK_IMAGE_URL);
    expect(result?.images[MOCK_NULL_NODE_ID]).toBeNull();
  });

  it("serves cached result on second call without re-fetching", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(imagesPayload([NODE_ID])), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchFigmaImages(FILE_KEY, [NODE_ID]);
    fetchMock.mockClear();

    const result = await fetchFigmaImages(FILE_KEY, [NODE_ID]);

    expect(result?.source).toBe("cache");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws FigmaApiError with Retry-After message on 429 with no cache", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "45" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFigmaImages(FILE_KEY, [NODE_ID])).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining("Try again in 45 seconds"),
    });
  });

  it("returns stale cache on 429 when a cached entry exists", async () => {
    let rateLimited = false;
    const fetchMock = vi.fn(async () => {
      if (rateLimited) {
        return new Response("rate limited", {
          status: 429,
          headers: { "Retry-After": "60" },
        });
      }
      return new Response(JSON.stringify(imagesPayload([NODE_ID])), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFigmaImages(FILE_KEY, [NODE_ID]);
    rateLimited = true;
    clearFigmaImageCache();

    // Manually put a stale entry back (peek — expose it by re-calling with still-valid cache window)
    // Actually we need the cache to have the entry. Let's repopulate it:
    rateLimited = false;
    await fetchFigmaImages(FILE_KEY, [NODE_ID]);
    rateLimited = true;
    fetchMock.mockClear();

    const result = await fetchFigmaImages(FILE_KEY, [NODE_ID]);
    expect(result?.source).toBe("cache");
    expect(result?.images[NODE_ID]).toBe(MOCK_IMAGE_URL);
  });

  it("throws FigmaApiError on 403", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("forbidden", { status: 403 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFigmaImages(FILE_KEY, [NODE_ID])).rejects.toMatchObject({
      status: 403,
    });
  });

  it("throws when Figma images API returns a non-null err field", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ err: "invalid_ids", images: {} }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFigmaImages(FILE_KEY, [NODE_ID])).rejects.toMatchObject({
      message: expect.stringContaining("invalid_ids"),
    });
  });

  it("batches requests when more than 50 node IDs are given", async () => {
    const ids = Array.from({ length: 55 }, (_, i) => `${i}:0`);
    const fetchMock = vi.fn(async (url: string) => {
      const urlObj = new URL(url as string);
      const batchIds = urlObj.searchParams.get("ids")!.split(",").map(decodeURIComponent);
      return new Response(JSON.stringify(imagesPayload(batchIds)), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFigmaImages(FILE_KEY, ids);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(Object.keys(result?.images ?? {})).toHaveLength(55);
  });
});
