import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedFixture: unknown | null = null;

/**
 * When true, scans load `example.json` (or FIGMA_FIXTURE_PATH) instead of the REST API.
 * - `FIGMA_USE_FIXTURE=true` → always fixture
 * - `FIGMA_USE_FIXTURE=false` → always API (requires token)
 * - unset → fixture in development, API in production
 */
export function isFigmaFixtureEnabled(): boolean {
  const flag = process.env.FIGMA_USE_FIXTURE?.trim().toLowerCase();
  if (flag === "false" || flag === "0") {
    return false;
  }
  if (flag === "true" || flag === "1") {
    return true;
  }
  return process.env.NODE_ENV === "development";
}

export function getFigmaFixturePath(): string {
  const custom = process.env.FIGMA_FIXTURE_PATH?.trim();
  return custom ? custom : join(process.cwd(), "example.json");
}

/** Loads cached Figma nodes/file JSON from disk (no network). */
export function loadFigmaFixture(): unknown {
  if (cachedFixture !== null) {
    return cachedFixture;
  }

  const path = getFigmaFixturePath();
  cachedFixture = JSON.parse(readFileSync(path, "utf-8")) as unknown;
  return cachedFixture;
}

/** Clears in-memory cache (for tests). */
export function clearFigmaFixtureCache(): void {
  cachedFixture = null;
}
