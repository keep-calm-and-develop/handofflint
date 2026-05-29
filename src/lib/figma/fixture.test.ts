import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearFigmaFixtureCache,
  loadFigmaFixture,
  isFigmaFixtureEnabled,
} from "@/lib/figma/fixture";

describe("isFigmaFixtureEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearFigmaFixtureCache();
  });

  it("returns true when FIGMA_USE_FIXTURE=true", () => {
    vi.stubEnv("FIGMA_USE_FIXTURE", "true");
    expect(isFigmaFixtureEnabled()).toBe(true);
  });

  it("returns false when FIGMA_USE_FIXTURE=false", () => {
    vi.stubEnv("FIGMA_USE_FIXTURE", "false");
    vi.stubEnv("NODE_ENV", "development");
    expect(isFigmaFixtureEnabled()).toBe(false);
  });
});

describe("loadFigmaFixture", () => {
  afterEach(() => {
    clearFigmaFixtureCache();
  });

  it("loads example.json with nodes document", () => {
    const data = loadFigmaFixture() as { nodes?: Record<string, unknown> };
    expect(data.nodes).toBeDefined();
    expect(Object.keys(data.nodes ?? {}).length).toBeGreaterThan(0);
  });
});
