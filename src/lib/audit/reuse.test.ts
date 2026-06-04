import { describe, expect, it } from "vitest";

import { isDetachedInstance, runReuseAudit } from "@/lib/audit/reuse";
import type { FigmaNode } from "@/lib/figma/node";

const FILE_KEY = "test-file-key";

describe("isDetachedInstance", () => {
  it("returns true for INSTANCE with no componentId", () => {
    const node: FigmaNode = { id: "1:1", name: "Button", type: "INSTANCE" };
    expect(isDetachedInstance(node)).toBe(true);
  });

  it("returns false for INSTANCE with a componentId", () => {
    const node: FigmaNode = {
      id: "1:2",
      name: "Button",
      type: "INSTANCE",
      componentId: "abc-123",
    };
    expect(isDetachedInstance(node)).toBe(false);
  });

  it("returns false for FRAME (not INSTANCE)", () => {
    const node: FigmaNode = { id: "1:3", name: "Button copy", type: "FRAME" };
    expect(isDetachedInstance(node)).toBe(false);
  });

  it("returns false for COMPONENT nodes", () => {
    const node: FigmaNode = { id: "1:4", name: "Button", type: "COMPONENT" };
    expect(isDetachedInstance(node)).toBe(false);
  });
});

describe("runReuseAudit", () => {
  // Test 1 — positive: INSTANCE with no componentId → medium finding
  it("flags a detached INSTANCE (no componentId) with medium severity", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Button",
      type: "INSTANCE",
    };
    const findings = runReuseAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      nodeId: "1:1",
      rule: "detached-instance",
      severity: "medium",
      auditTool: "reuse",
    });
  });

  // Test 2 — negative: INSTANCE with componentId → no finding
  it("does not flag an INSTANCE that has a componentId", () => {
    const root: FigmaNode = {
      id: "1:2",
      name: "Button",
      type: "INSTANCE",
      componentId: "component-master-id",
    };
    expect(runReuseAudit([root], { fileKey: FILE_KEY })).toHaveLength(0);
  });

  // Test 3 — negative: FRAME type (detached nodes become FRAME in Figma — not our scope)
  it("does not flag a FRAME node even if it looks like a detached copy", () => {
    const root: FigmaNode = {
      id: "1:3",
      name: "Button copy",
      type: "FRAME",
      children: [
        { id: "1:4", name: "Label", type: "TEXT" },
      ],
    };
    expect(runReuseAudit([root], { fileKey: FILE_KEY })).toHaveLength(0);
  });

  // Test 4 — nested: detached INSTANCE inside a COMPONENT → still flagged
  it("flags a detached INSTANCE nested inside a COMPONENT", () => {
    const detached: FigmaNode = {
      id: "2:1",
      name: "Icon (detached)",
      type: "INSTANCE",
    };
    const root: FigmaNode = {
      id: "1:1",
      name: "Card",
      type: "COMPONENT",
      children: [detached],
    };
    const findings = runReuseAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.nodeId).toBe("2:1");
  });

  // Test 5 — dedup: same detached INSTANCE appearing in two roots → 1 finding
  it("deduplicates a detached INSTANCE across multiple roots", () => {
    const node: FigmaNode = {
      id: "3:1",
      name: "Badge",
      type: "INSTANCE",
    };
    const findings = runReuseAudit([node, node], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
  });

  // Multiple detached instances in one tree → separate findings per node
  it("emits one finding per distinct detached INSTANCE", () => {
    const root: FigmaNode = {
      id: "1:0",
      name: "Screen",
      type: "FRAME",
      children: [
        { id: "1:1", name: "Btn A", type: "INSTANCE" },
        { id: "1:2", name: "Btn B", type: "INSTANCE" },
        { id: "1:3", name: "Btn C", type: "INSTANCE", componentId: "master" },
      ],
    };
    const findings = runReuseAudit([root], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(2);
    const ids = findings.map((f) => f.nodeId);
    expect(ids).toContain("1:1");
    expect(ids).toContain("1:2");
  });
});
