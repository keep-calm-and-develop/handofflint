import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  isSemanticLayerName,
  runNamingAudit,
  shouldEvaluateNodeNaming,
} from "@/lib/audit/naming";
import type { FigmaNode } from "@/lib/figma/node";
import { extractFigmaDocuments } from "@/lib/figma/tree";

const EXAMPLE_FILE = join(process.cwd(), "example.json");
const FILE_KEY = "test-file-key";

function loadExampleRoots(): FigmaNode[] {
  const raw = JSON.parse(readFileSync(EXAMPLE_FILE, "utf-8")) as unknown;
  return extractFigmaDocuments(raw);
}

describe("isSemanticLayerName", () => {
  it("treats Pincode input as semantic and Rectangle 2 as not", () => {
    expect(isSemanticLayerName("Pincode input")).toBe(true);
    expect(isSemanticLayerName("Rectangle 2")).toBe(false);
  });
});

describe("shouldEvaluateNodeNaming (B + A)", () => {
  const pincode: FigmaNode = {
    id: "2:28",
    name: "Pincode input",
    type: "COMPONENT",
  };

  it("skips primitives inside a semantic component", () => {
    const line: FigmaNode = { id: "2:22", name: "Line 1", type: "LINE" };
    expect(shouldEvaluateNodeNaming(line, [pincode])).toBe(false);
  });

  it("still evaluates structural types", () => {
    const frame: FigmaNode = { id: "1:1", name: "Frame 17", type: "FRAME" };
    expect(shouldEvaluateNodeNaming(frame, [pincode])).toBe(true);
  });
});

describe("runNamingAudit", () => {
  it("flags orphan primitives with default names", () => {
    const root: FigmaNode = {
      id: "2:0",
      name: "Rectangle 1",
      type: "RECTANGLE",
    };
    const findings = runNamingAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      nodeId: "2:0",
      rule: "default-layer-name",
    });
  });

  it("does not flag pincode dividers inside Pincode input component", () => {
    const root: FigmaNode = {
      id: "2:28",
      name: "Pincode input",
      type: "COMPONENT",
      children: [
        { id: "2:20", name: "Rectangle 2", type: "RECTANGLE" },
        { id: "2:22", name: "Line 1", type: "LINE" },
        { id: "2:26", name: "Line 5", type: "LINE" },
      ],
    };
    const findings = runNamingAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  it("does not flag primitives under a semantic group", () => {
    const root: FigmaNode = {
      id: "2:36",
      name: "Quick Search Section",
      type: "GROUP",
      children: [{ id: "2:0", name: "Rectangle 1", type: "RECTANGLE" }],
    };
    expect(runNamingAudit([root], { fileKey: FILE_KEY })).toHaveLength(0);
  });

  it("flags structural Frame 17 at the root", () => {
    const root: FigmaNode = {
      id: "9:9",
      name: "Frame 17",
      type: "FRAME",
    };
    const findings = runNamingAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.nodeName).toBe("Frame 17");
  });

  it("does not flag semantic section names", () => {
    const root: FigmaNode = {
      id: "2:36",
      name: "Quick Search Section",
      type: "GROUP",
    };
    expect(runNamingAudit([root], { fileKey: FILE_KEY })).toHaveLength(0);
  });

  it("flags orphan Vector but not Vector inside Menu icon frame", () => {
    const menuIcon: FigmaNode = {
      id: "3:3",
      name: "Menu icon",
      type: "FRAME",
      children: [{ id: "3:4", name: "Vector", type: "VECTOR" }],
    };
    expect(runNamingAudit([menuIcon], { fileKey: FILE_KEY })).toHaveLength(0);

    const orphan: FigmaNode = { id: "3:4", name: "Vector", type: "VECTOR" };
    const findings = runNamingAudit([orphan], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.rule).toBe("generic-layer-name");
  });

  it("flags empty layer names as high severity", () => {
    const root: FigmaNode = {
      id: "99:1",
      name: "   ",
      type: "FRAME",
    };
    const findings = runNamingAudit([root], { fileKey: FILE_KEY });
    expect(findings[0]).toMatchObject({
      rule: "empty-layer-name",
      severity: "high",
    });
  });

  it("returns no false positives on example.json (vaxin pincode UI)", () => {
    const roots = loadExampleRoots();
    const findings = runNamingAudit(roots, { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });
});
