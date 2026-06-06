import { afterEach, describe, expect, it } from "vitest";

import {
  clearFigmaTreeCache,
  indexFigmaTreeNodes,
} from "@/lib/figma/cache";
import type { FigmaNode } from "@/lib/figma/node";

import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/agent/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const frame: FigmaNode = {
  id: "1:1",
  name: "Frame",
  type: "FRAME",
  layoutMode: "VERTICAL",
  children: [
    {
      id: "1:2",
      name: "btn_submit",
      type: "INSTANCE",
      componentId: "c1",
    },
    {
      id: "1:3",
      name: "Hello World",
      type: "TEXT",
      characters: "Hello World",
      style: { fontSize: 16, fontWeight: 400 },
    },
  ],
};

function primeCache(fileKey = "test-file") {
  indexFigmaTreeNodes(fileKey, frame);
}

describe("POST /api/agent/audit", () => {
  afterEach(() => {
    clearFigmaTreeCache();
  });

  // ── Input validation ────────────────────────────────────────────────

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/agent/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 400 when fileKey is missing", async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing fileKey" });
  });

  it("returns 400 when fileKey is empty string", async () => {
    const res = await POST(jsonRequest({ fileKey: "   " }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing fileKey" });
  });

  // ── Cache miss ─────────────────────────────────────────────────────

  it("returns 400 cache miss when fileKey not in cache", async () => {
    const res = await POST(jsonRequest({ fileKey: "unknown-file" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Cache miss — run /api/agent/init first",
    });
  });

  // ── Happy path ─────────────────────────────────────────────────────

  it("runs audits and returns readinessScore + findings for cached file", async () => {
    primeCache("test-file");

    const res = await POST(jsonRequest({ fileKey: "test-file" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(typeof json.readinessScore).toBe("number");
    expect(json.readinessScore).toBeGreaterThanOrEqual(0);
    expect(json.readinessScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(json.findings)).toBe(true);
    expect(json.nodesScanned).toBeGreaterThan(0);
  });

  it("uses default layoutHandoffProfile when not specified", async () => {
    primeCache("test-file");

    const res = await POST(jsonRequest({ fileKey: "test-file" }));
    const json = await res.json();

    expect(json.layoutHandoffProfile).toBe("separate-screens");
  });

  it("accepts a custom layoutHandoffProfile", async () => {
    primeCache("test-file");

    const res = await POST(
      jsonRequest({
        fileKey: "test-file",
        layoutHandoffProfile: "flexible-layout",
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.layoutHandoffProfile).toBe("flexible-layout");
  });

  it("falls back to defaults for invalid optional params", async () => {
    primeCache("test-file");

    const res = await POST(
      jsonRequest({
        fileKey: "test-file",
        layoutHandoffProfile: "invalid-value",
        contrastLevel: "nope",
        gridBase: 999,
        exportQuality: 7,
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.layoutHandoffProfile).toBe("separate-screens");
  });

  it("findings are sorted by severity (critical first)", async () => {
    primeCache("test-file");

    const res = await POST(jsonRequest({ fileKey: "test-file" }));
    const json = await res.json();

    if (json.findings.length >= 2) {
      const severityOrder = ["critical", "high", "medium", "low"];
      for (let i = 1; i < json.findings.length; i++) {
        const prev = severityOrder.indexOf(json.findings[i - 1].severity);
        const curr = severityOrder.indexOf(json.findings[i].severity);
        expect(prev).toBeLessThanOrEqual(curr);
      }
    }
  });
});
