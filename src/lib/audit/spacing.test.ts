import { describe, expect, it } from "vitest";

import {
  isAutoLayoutFrame,
  isOnGrid,
  runSpacingAudit,
} from "@/lib/audit/spacing";
import type { FigmaNode } from "@/lib/figma/node";

const FILE_KEY = "test-file-key";

describe("isAutoLayoutFrame", () => {
  it("returns true for HORIZONTAL layout", () => {
    expect(
      isAutoLayoutFrame({ id: "1", name: "Row", type: "FRAME", layoutMode: "HORIZONTAL" }),
    ).toBe(true);
  });

  it("returns true for VERTICAL layout", () => {
    expect(
      isAutoLayoutFrame({ id: "1", name: "Col", type: "FRAME", layoutMode: "VERTICAL" }),
    ).toBe(true);
  });

  it("returns false when layoutMode is absent", () => {
    expect(
      isAutoLayoutFrame({ id: "1", name: "Static", type: "FRAME" }),
    ).toBe(false);
  });

  it("returns false for NONE layout mode", () => {
    expect(
      isAutoLayoutFrame({ id: "1", name: "Static", type: "FRAME", layoutMode: "NONE" }),
    ).toBe(false);
  });
});

describe("isOnGrid", () => {
  it("returns true for multiples of grid base", () => {
    expect(isOnGrid(8, 4)).toBe(true);
    expect(isOnGrid(12, 4)).toBe(true);
    expect(isOnGrid(16, 8)).toBe(true);
  });

  it("returns false for non-multiples", () => {
    expect(isOnGrid(13, 4)).toBe(false);
    expect(isOnGrid(7, 4)).toBe(false);
    expect(isOnGrid(10, 8)).toBe(false);
  });
});

describe("runSpacingAudit", () => {
  it("flags off-grid itemSpacing as medium severity", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Card",
      type: "FRAME",
      layoutMode: "VERTICAL",
      itemSpacing: 13,
      paddingTop: 16,
      paddingBottom: 16,
      paddingLeft: 16,
      paddingRight: 16,
    };
    const findings = runSpacingAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      nodeId: "1:1",
      nodeName: "Card",
      rule: "off-grid-spacing",
      severity: "medium",
      auditTool: "spacing",
    });
    expect(findings[0].message).toContain("itemSpacing");
    expect(findings[0].message).toContain("13px");
    expect(findings[0].message).toContain("4px grid");
  });

  it("produces no findings for on-grid values", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Header",
      type: "FRAME",
      layoutMode: "HORIZONTAL",
      itemSpacing: 16,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 8,
      paddingRight: 8,
    };
    const findings = runSpacingAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  it("flags zero spacing as low severity warning", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Stack",
      type: "FRAME",
      layoutMode: "VERTICAL",
      itemSpacing: 0,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 8,
      paddingRight: 8,
    };
    const findings = runSpacingAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: "zero-spacing",
      severity: "low",
      nodeId: "1:1",
    });
    expect(findings[0].message).toContain("itemSpacing");
    expect(findings[0].message).toContain("0");
  });

  it("flags only the off-grid property when others are valid", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Panel",
      type: "FRAME",
      layoutMode: "HORIZONTAL",
      itemSpacing: 8,
      paddingLeft: 7,
      paddingRight: 16,
      paddingTop: 12,
      paddingBottom: 12,
    };
    const findings = runSpacingAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: "off-grid-spacing",
      severity: "medium",
    });
    expect(findings[0].message).toContain("paddingLeft");
    expect(findings[0].message).toContain("7px");
  });

  it("skips frames without auto-layout", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Absolute",
      type: "FRAME",
      itemSpacing: 13,
      paddingLeft: 5,
    };
    const findings = runSpacingAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  it("respects custom gridBase option", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Wide",
      type: "FRAME",
      layoutMode: "HORIZONTAL",
      itemSpacing: 10,
    };
    // 10 is not a multiple of 8
    const findings8 = runSpacingAudit([root], { fileKey: FILE_KEY, gridBase: 8 });
    expect(findings8).toHaveLength(1);
    expect(findings8[0].rule).toBe("off-grid-spacing");

    // 10 is not a multiple of 4 either
    const findings4 = runSpacingAudit([root], { fileKey: FILE_KEY, gridBase: 4 });
    expect(findings4).toHaveLength(1);

    // 10 is a multiple of 5
    const findings5 = runSpacingAudit([root], { fileKey: FILE_KEY, gridBase: 5 });
    expect(findings5).toHaveLength(0);
  });

  it("audits nested auto-layout frames", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Page",
      type: "FRAME",
      layoutMode: "VERTICAL",
      itemSpacing: 24,
      children: [
        {
          id: "1:2",
          name: "Row",
          type: "FRAME",
          layoutMode: "HORIZONTAL",
          itemSpacing: 11,
        },
      ],
    };
    const findings = runSpacingAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0].nodeId).toBe("1:2");
    expect(findings[0].message).toContain("11px");
  });

  it("does not duplicate findings for the same node", () => {
    const node: FigmaNode = {
      id: "1:1",
      name: "Dup",
      type: "FRAME",
      layoutMode: "VERTICAL",
      itemSpacing: 13,
    };
    const findings = runSpacingAudit([node, node], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
  });
});
