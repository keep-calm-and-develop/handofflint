import { describe, expect, it } from "vitest";

import {
  isSvgExportMarked,
  isVectorLeaf,
  pinnedAxisCount,
  runSvgAudit,
} from "@/lib/audit/svg";
import type { FigmaNode } from "@/lib/figma/node";

const FILE_KEY = "test-file-key";

describe("pinnedAxisCount", () => {
  it("returns 2 when both axes are hard-pinned", () => {
    expect(pinnedAxisCount({ horizontal: "LEFT", vertical: "TOP" })).toBe(2);
    expect(pinnedAxisCount({ horizontal: "RIGHT", vertical: "BOTTOM" })).toBe(2);
    expect(pinnedAxisCount({ horizontal: "CENTER", vertical: "CENTER" })).toBe(2);
  });

  it("returns 0 when both axes scale", () => {
    expect(pinnedAxisCount({ horizontal: "SCALE", vertical: "SCALE" })).toBe(0);
    expect(pinnedAxisCount({ horizontal: "LEFT_RIGHT", vertical: "TOP_BOTTOM" })).toBe(0);
  });

  it("returns 1 when only one axis is hard-pinned", () => {
    expect(pinnedAxisCount({ horizontal: "SCALE", vertical: "TOP" })).toBe(1);
    expect(pinnedAxisCount({ horizontal: "LEFT", vertical: "SCALE" })).toBe(1);
  });
});

describe("isSvgExportMarked", () => {
  it("returns true for nodes with SVG exportSettings", () => {
    const node: FigmaNode = {
      id: "1:1", name: "Icon", type: "FRAME",
      exportSettings: [{ format: "SVG" }],
    };
    expect(isSvgExportMarked(node)).toBe(true);
  });

  it("returns false for PNG-only export settings", () => {
    const node: FigmaNode = {
      id: "1:1", name: "Photo", type: "FRAME",
      exportSettings: [{ format: "PNG", constraint: { type: "SCALE", value: 2 } }],
    };
    expect(isSvgExportMarked(node)).toBe(false);
  });

  it("returns false when exportSettings is absent", () => {
    const node: FigmaNode = { id: "1:1", name: "Frame", type: "FRAME" };
    expect(isSvgExportMarked(node)).toBe(false);
  });
});

describe("isVectorLeaf", () => {
  it("returns true for a VECTOR with no children", () => {
    expect(isVectorLeaf({ id: "1", name: "v", type: "VECTOR" })).toBe(true);
    expect(isVectorLeaf({ id: "2", name: "b", type: "BOOLEAN_OPERATION" })).toBe(true);
  });

  it("returns false for a non-vector type", () => {
    expect(isVectorLeaf({ id: "3", name: "f", type: "FRAME" })).toBe(false);
  });
});

describe("runSvgAudit", () => {
  // Test 1 — positive case: both axes pinned inside SVG-export-marked parent → high
  it("flags a vector with both axes hard-pinned inside an SVG-export parent (high)", () => {
    const child: FigmaNode = {
      id: "2:1",
      name: "path",
      type: "VECTOR",
      constraints: { horizontal: "LEFT", vertical: "TOP" },
    };
    const parent: FigmaNode = {
      id: "1:1",
      name: "icon/arrow",
      type: "FRAME",
      exportSettings: [{ format: "SVG" }],
      children: [child],
    };
    const findings = runSvgAudit([parent], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      nodeId: "2:1",
      rule: "absolute-positioned-svg-child",
      severity: "high",
      auditTool: "svg",
    });
  });

  // Test 2 — negative case: SCALE on both axes → no finding
  it("does not flag a vector with SCALE constraints", () => {
    const child: FigmaNode = {
      id: "2:2",
      name: "path",
      type: "VECTOR",
      constraints: { horizontal: "SCALE", vertical: "SCALE" },
    };
    const parent: FigmaNode = {
      id: "1:2",
      name: "icon/check",
      type: "FRAME",
      exportSettings: [{ format: "SVG" }],
      children: [child],
    };
    expect(runSvgAudit([parent], { fileKey: FILE_KEY })).toHaveLength(0);
  });

  // Test 3 — boundary case: one axis pinned → medium severity
  it("flags one-axis-pinned child with medium severity", () => {
    const child: FigmaNode = {
      id: "2:3",
      name: "path",
      type: "VECTOR",
      constraints: { horizontal: "SCALE", vertical: "TOP" },
    };
    const parent: FigmaNode = {
      id: "1:3",
      name: "icon/close",
      type: "FRAME",
      exportSettings: [{ format: "SVG" }],
      children: [child],
    };
    const findings = runSvgAudit([parent], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("medium");
  });

  // Test 4 — secondary heuristic: standalone VECTOR leaf with no export-marked parent → low
  it("flags a standalone VECTOR leaf with pinned constraints at low severity", () => {
    const vectorLeaf: FigmaNode = {
      id: "3:1",
      name: "arrow-path",
      type: "VECTOR",
      constraints: { horizontal: "LEFT", vertical: "TOP" },
    };
    const parent: FigmaNode = {
      id: "1:4",
      name: "Artboard",
      type: "FRAME",
      children: [vectorLeaf],
    };
    const findings = runSvgAudit([parent], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("low");
  });

  // Test 5 — PNG-only export: must NOT flag
  it("does not flag a vector inside a PNG-only export parent", () => {
    const child: FigmaNode = {
      id: "2:5",
      name: "path",
      type: "VECTOR",
      constraints: { horizontal: "LEFT", vertical: "TOP" },
    };
    const parent: FigmaNode = {
      id: "1:5",
      name: "photo-thumbnail",
      type: "FRAME",
      exportSettings: [{ format: "PNG", constraint: { type: "SCALE", value: 2 } }],
      children: [child],
    };
    // Child has pinned constraints but parent is PNG-only — no SVG scaling concern.
    // The VECTOR leaf heuristic still fires at low severity because it's a vector leaf.
    // The export-primary concern (high/medium) must NOT fire.
    const findings = runSvgAudit([parent], { fileKey: FILE_KEY });
    const highOrMedium = findings.filter(
      (f) => f.severity === "high" || f.severity === "medium",
    );
    expect(highOrMedium).toHaveLength(0);
  });

  // Deduplication: same node in two roots must produce only 1 finding
  it("deduplicates findings across multiple roots", () => {
    const child: FigmaNode = {
      id: "2:99",
      name: "dup-path",
      type: "VECTOR",
      constraints: { horizontal: "LEFT", vertical: "TOP" },
    };
    const parent: FigmaNode = {
      id: "1:99",
      name: "dup-icon",
      type: "FRAME",
      exportSettings: [{ format: "SVG" }],
      children: [child],
    };
    const findings = runSvgAudit([parent, parent], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
  });
});
