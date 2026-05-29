import { afterEach, describe, expect, it, vi } from "vitest";

import { clearFigmaFixtureCache } from "@/lib/figma/fixture";
import { fetchFigmaTree } from "@/lib/figma/client";

describe("fetchFigmaTree", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearFigmaFixtureCache();
  });

  it("returns fixture data without a token when FIGMA_USE_FIXTURE=true", async () => {
    vi.stubEnv("FIGMA_USE_FIXTURE", "true");
    vi.stubEnv("FIGMA_ACCESS_TOKEN", "");

    const result = await fetchFigmaTree("any-file-key", "1:4");
    expect(result?.source).toBe("fixture");
    expect(result?.data).toBeTruthy();
  });
});
