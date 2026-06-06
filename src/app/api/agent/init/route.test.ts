import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearFigmaTreeCache, getTreeFromCache } from "@/lib/figma/cache";
import { figmaMockServer } from "@/mocks/server";

import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/agent/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function badRequest(raw: string): Request {
  return new Request("http://localhost/api/agent/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw,
  });
}

const VALID_FIGMA_URL =
  "https://www.figma.com/design/abc123/My-Design?node-id=1-4";

describe("POST /api/agent/init", () => {
  beforeEach(() => {
    figmaMockServer.listen({ onUnhandledRequest: "error" });
    vi.stubEnv("FIGMA_ACCESS_TOKEN", "test-token");
    vi.stubEnv("FIGMA_CACHE_ENABLED", "false");
    vi.stubEnv("FIGMA_API_MOCK", "false");
  });

  afterEach(() => {
    figmaMockServer.close();
    vi.unstubAllEnvs();
    clearFigmaTreeCache();
  });

  // ── Input validation ────────────────────────────────────────────────

  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(badRequest("{not json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 400 when url is missing", async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing Figma URL" });
  });

  it("returns 400 when url is empty string", async () => {
    const res = await POST(jsonRequest({ url: "   " }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing Figma URL" });
  });

  it("returns 400 for a non-Figma URL", async () => {
    const res = await POST(jsonRequest({ url: "https://example.com/file" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.any(String) });
  });

  // ── Token missing ──────────────────────────────────────────────────

  it("returns 500 when FIGMA_ACCESS_TOKEN is not set", async () => {
    vi.stubEnv("FIGMA_ACCESS_TOKEN", "");

    const res = await POST(jsonRequest({ url: VALID_FIGMA_URL }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "FIGMA_ACCESS_TOKEN is not configured",
    });
  });

  // ── Happy path with MSW mock ───────────────────────────────────────

  it("fetches tree, primes cache, and returns success with node count", async () => {
    const res = await POST(jsonRequest({ url: VALID_FIGMA_URL }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.fileKey).toBe("abc123");
    expect(json.nodeId).toBe("1:4");
    expect(json.nodesIndexed).toBeGreaterThan(0);
  });

  it("populates the node registry cache after successful init", async () => {
    expect(getTreeFromCache("abc123")).toBeNull();

    await POST(jsonRequest({ url: VALID_FIGMA_URL }));

    const cached = getTreeFromCache("abc123");
    expect(cached).not.toBeNull();
    expect(cached!.size).toBeGreaterThan(0);
  });

  it("handles a URL without node-id (full file fetch)", async () => {
    const url = "https://www.figma.com/design/abc123/My-Design";

    const res = await POST(jsonRequest({ url }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.fileKey).toBe("abc123");
    expect(json.nodeId).toBeNull();
    expect(json.nodesIndexed).toBeGreaterThan(0);
  });
});
