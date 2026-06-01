import { describe, expect, it } from "vitest";

import {
  isInsideComponentOrInstance,
  isNodeVisible,
  resolveHiddenSeverity,
  runHiddenAudit,
} from "@/lib/audit/hidden";
import type { FigmaNode } from "@/lib/figma/node";

const FILE_KEY = "test-file-key";

describe("isNodeVisible", () => {
  it("treats absent visible as visible", () => {
    expect(isNodeVisible({ id: "1", name: "A", type: "FRAME" })).toBe(true);
  });

  it("treats visible: true as visible", () => {
    expect(isNodeVisible({ id: "1", name: "A", type: "FRAME", visible: true })).toBe(true);
  });

  it("treats visible: false as hidden", () => {
    expect(isNodeVisible({ id: "1", name: "A", type: "FRAME", visible: false })).toBe(false);
  });
});

describe("isInsideComponentOrInstance", () => {
  it("returns true when a COMPONENT ancestor exists", () => {
    const ancestors: FigmaNode[] = [
      { id: "1", name: "Toggle", type: "COMPONENT" },
    ];
    expect(isInsideComponentOrInstance(ancestors)).toBe(true);
  });

  it("returns true when an INSTANCE ancestor exists", () => {
    const ancestors: FigmaNode[] = [
      { id: "1", name: "ButtonInstance", type: "INSTANCE" },
    ];
    expect(isInsideComponentOrInstance(ancestors)).toBe(true);
  });

  it("returns false for FRAME-only ancestry", () => {
    const ancestors: FigmaNode[] = [
      { id: "1", name: "Screen", type: "FRAME" },
    ];
    expect(isInsideComponentOrInstance(ancestors)).toBe(false);
  });
});

describe("resolveHiddenSeverity", () => {
  it("returns medium for root level (0 ancestors)", () => {
    expect(resolveHiddenSeverity([])).toBe("medium");
  });

  it("returns medium for 1-deep (1 ancestor)", () => {
    const ancestors: FigmaNode[] = [{ id: "1", name: "Root", type: "FRAME" }];
    expect(resolveHiddenSeverity(ancestors)).toBe("medium");
  });

  it("returns low for deeply nested (2+ ancestors)", () => {
    const ancestors: FigmaNode[] = [
      { id: "1", name: "Root", type: "FRAME" },
      { id: "2", name: "Section", type: "FRAME" },
    ];
    expect(resolveHiddenSeverity(ancestors)).toBe("low");
  });
});

describe("runHiddenAudit", () => {
  it("flags a hidden top-level frame as medium", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "old-header-v2",
      type: "FRAME",
      visible: false,
      children: [],
    };
    const findings = runHiddenAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      nodeId: "1:1",
      nodeName: "old-header-v2",
      rule: "hidden-top-level-layer",
      severity: "medium",
      auditTool: "hidden",
    });
  });

  it("skips hidden layers inside COMPONENT ancestors", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Toggle",
      type: "COMPONENT",
      children: [
        { id: "1:2", name: "off-state", type: "FRAME", visible: false },
      ],
    };
    const findings = runHiddenAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  it("flags deeply nested hidden layer as low severity", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Screen",
      type: "FRAME",
      children: [
        {
          id: "1:2",
          name: "Section",
          type: "FRAME",
          children: [
            { id: "1:3", name: "debug-overlay", type: "FRAME", visible: false },
          ],
        },
      ],
    };
    const findings = runHiddenAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      nodeId: "1:3",
      rule: "hidden-nested-layer",
      severity: "low",
    });
  });

  it("produces no findings for fully visible trees", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Dashboard",
      type: "FRAME",
      children: [
        { id: "1:2", name: "Header", type: "FRAME" },
        { id: "1:3", name: "Content", type: "TEXT" },
      ],
    };
    const findings = runHiddenAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  it("skips hidden layers inside INSTANCE ancestors", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Screen",
      type: "FRAME",
      children: [
        {
          id: "1:2",
          name: "CardInstance",
          type: "INSTANCE",
          children: [
            { id: "1:3", name: "hidden-detail", type: "TEXT", visible: false },
          ],
        },
      ],
    };
    const findings = runHiddenAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  it("does not duplicate findings for the same node", () => {
    const hidden: FigmaNode = {
      id: "1:2",
      name: "ghost",
      type: "FRAME",
      visible: false,
    };
    const findings = runHiddenAudit([hidden, hidden], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
  });
});
