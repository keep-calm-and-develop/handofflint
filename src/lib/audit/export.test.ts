import { describe, expect, it } from "vitest";

import { evaluateExportSetting, runExportAudit } from "@/lib/audit/export";
import type { FigmaExportSetting, FigmaNode } from "@/lib/figma/node";

const FILE_KEY = "test-file-key";

function frame(
  id: string,
  name: string,
  exportSettings: FigmaExportSetting[],
): FigmaNode {
  return { id, name, type: "FRAME", exportSettings };
}

describe("evaluateExportSetting", () => {
  it("returns null for SVG format (resolution-independent)", () => {
    const node = frame("1:1", "Icon", []);
    const setting: FigmaExportSetting = { format: "SVG" };
    expect(evaluateExportSetting(node, setting, 0, 2)).toBeNull();
  });

  it("returns null for PDF format", () => {
    const node = frame("1:2", "Doc", []);
    const setting: FigmaExportSetting = { format: "PDF" };
    expect(evaluateExportSetting(node, setting, 0, 2)).toBeNull();
  });

  it("returns raster-missing-scale for PNG with no constraint", () => {
    const node = frame("1:3", "Banner", []);
    const setting: FigmaExportSetting = { format: "PNG" };
    const result = evaluateExportSetting(node, setting, 0, 2);
    expect(result).toMatchObject({ rule: "raster-missing-scale", severity: "high" });
  });

  it("returns raster-below-min-scale for JPG at @1x", () => {
    const node = frame("1:4", "Hero", []);
    const setting: FigmaExportSetting = {
      format: "JPG",
      constraint: { type: "SCALE", value: 1 },
    };
    const result = evaluateExportSetting(node, setting, 0, 2);
    expect(result).toMatchObject({ rule: "raster-below-min-scale", severity: "medium" });
  });

  it("returns null for PNG with SCALE >= 2 (passes)", () => {
    const node = frame("1:5", "Photo", []);
    const setting: FigmaExportSetting = {
      format: "PNG",
      constraint: { type: "SCALE", value: 2 },
    };
    expect(evaluateExportSetting(node, setting, 0, 2)).toBeNull();
  });
});

describe("runExportAudit", () => {
  // Test 1 — positive: PNG with no constraint → high
  it("flags a PNG export with no constraint (raster-missing-scale, high)", () => {
    const root = frame("1:1", "Banner", [{ format: "PNG" }]);
    const findings = runExportAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      nodeId: "1:1",
      rule: "raster-missing-scale",
      severity: "high",
      auditTool: "export",
    });
  });

  // Test 2 — negative: PNG @2x → no finding
  it("does not flag PNG with SCALE:2 constraint", () => {
    const root = frame("1:2", "Banner2x", [
      { format: "PNG", constraint: { type: "SCALE", value: 2 } },
    ]);
    expect(runExportAudit([root], { fileKey: FILE_KEY })).toHaveLength(0);
  });

  // Test 3 — boundary: PNG @1x → medium
  it("flags PNG with SCALE:1 (below 2x minimum) as medium", () => {
    const root = frame("1:3", "Banner1x", [
      { format: "PNG", constraint: { type: "SCALE", value: 1 } },
    ]);
    const findings = runExportAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("medium");
    expect(findings[0]?.rule).toBe("raster-below-min-scale");
  });

  // Test 4 — SVG exclusion: SVG export → no finding
  it("does not flag SVG export settings", () => {
    const root = frame("1:4", "Icon", [{ format: "SVG" }]);
    expect(runExportAudit([root], { fileKey: FILE_KEY })).toHaveLength(0);
  });

  // Test 5 — mixed settings: SVG + JPG-no-constraint → 1 finding (only JPG)
  it("flags only the JPG entry in a mixed SVG+JPG export config", () => {
    const root = frame("1:5", "Asset", [{ format: "SVG" }, { format: "JPG" }]);
    const findings = runExportAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.rule).toBe("raster-missing-scale");
  });

  // Test 6 — configurable minRasterScale: PNG @1.5x passes when minScale=1
  it("passes PNG @1.5x when minRasterScale is set to 1", () => {
    const root = frame("1:6", "Low-res", [
      { format: "PNG", constraint: { type: "SCALE", value: 1.5 } },
    ]);
    expect(
      runExportAudit([root], { fileKey: FILE_KEY, minRasterScale: 1 }),
    ).toHaveLength(0);
  });

  // Node with no exportSettings → no finding
  it("ignores nodes with no exportSettings", () => {
    const root: FigmaNode = { id: "1:7", name: "Bare frame", type: "FRAME" };
    expect(runExportAudit([root], { fileKey: FILE_KEY })).toHaveLength(0);
  });

  // Deduplication
  it("deduplicates the same node across multiple roots", () => {
    const root = frame("1:8", "Dup", [{ format: "PNG" }]);
    const findings = runExportAudit([root, root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
  });
});
