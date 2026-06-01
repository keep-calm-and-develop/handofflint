import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchFigmaTree } from "@/lib/figma/client";
import { isFigmaApiMockEnabled } from "@/lib/figma/mock-enabled";
import { figmaMockServer } from "@/mocks/server";

const globalForMsw = globalThis as typeof globalThis & {
  __mswListening?: boolean;
};

describe("isFigmaApiMockEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false by default", () => {
    vi.stubEnv("FIGMA_API_MOCK", undefined);
    expect(isFigmaApiMockEnabled()).toBe(false);
  });

  it("is true when FIGMA_API_MOCK=true", () => {
    vi.stubEnv("FIGMA_API_MOCK", "true");
    expect(isFigmaApiMockEnabled()).toBe(true);
  });
});

describe("figma MSW handlers", () => {
  beforeEach(() => {
    figmaMockServer.listen({ onUnhandledRequest: "error" });
    vi.stubEnv("FIGMA_ACCESS_TOKEN", "test-token");
    vi.stubEnv("FIGMA_CACHE_ENABLED", "false");
    vi.stubEnv("FIGMA_API_MOCK", "false");
  });

  afterEach(() => {
    figmaMockServer.close();
    vi.unstubAllEnvs();
  });

  it("returns example.json for node tree fetch", async () => {
    const result = await fetchFigmaTree("any-file-key", "1:4");

    expect(result?.source).toBe("api");
    expect(result?.data).toMatchObject({
      name: "vaxin",
      nodes: expect.objectContaining({
        "1:4": expect.objectContaining({
          document: expect.objectContaining({ id: "1:4" }),
        }),
      }),
    });
  });

  it("returns file-shaped tree for depth=2 fetch", async () => {
    const result = await fetchFigmaTree("any-file-key", null);

    expect(result?.source).toBe("api");
    expect(result?.data).toMatchObject({
      name: "vaxin",
      document: expect.objectContaining({ id: "1:4" }),
    });
    expect(result?.data).not.toHaveProperty("nodes");
  });
});

describe("fetchFigmaTree with FIGMA_API_MOCK", () => {
  beforeEach(() => {
    globalForMsw.__mswListening = false;
    vi.stubEnv("FIGMA_ACCESS_TOKEN", "test-token");
    vi.stubEnv("FIGMA_API_MOCK", "true");
    vi.stubEnv("FIGMA_CACHE_ENABLED", "false");
  });

  afterEach(() => {
    figmaMockServer.close();
    globalForMsw.__mswListening = false;
    vi.unstubAllEnvs();
  });

  it("starts MSW via ensureFigmaMockServer and returns handler data", async () => {
    const result = await fetchFigmaTree("any-file-key", "1:4");

    expect(result?.source).toBe("api");
    expect(result?.data).toMatchObject({
      name: "vaxin",
      nodes: expect.objectContaining({
        "1:4": expect.objectContaining({
          document: expect.objectContaining({ id: "1:4" }),
        }),
      }),
    });
  });
});
