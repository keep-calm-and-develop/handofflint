import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { countFigmaNodes, extractFigmaDocuments } from "@/lib/figma/tree";

const EXAMPLE_FILE = join(process.cwd(), "example.json");

describe("extractFigmaDocuments", () => {
  it("parses example.json nodes payload", () => {
    const raw = JSON.parse(readFileSync(EXAMPLE_FILE, "utf-8")) as unknown;
    const roots = extractFigmaDocuments(raw);
    expect(roots).toHaveLength(1);
    expect(roots[0]?.name).toBe("Google Pixel 2 - 1");
    expect(countFigmaNodes(roots)).toBeGreaterThan(20);
  });
});
