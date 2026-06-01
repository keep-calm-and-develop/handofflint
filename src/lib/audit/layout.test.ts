import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  hasAutoLayout,
  resolveLayoutSeverity,
  runLayoutAudit,
  shouldEvaluateLayoutNode,
} from "@/lib/audit/layout";
import type { FigmaNode } from "@/lib/figma/node";
import { extractFigmaDocuments } from "@/lib/figma/tree";

const EXAMPLE_FILE = join(process.cwd(), "example.json");
const FILE_KEY = "test-file-key";

function loadExampleRoots(): FigmaNode[] {
  const raw = JSON.parse(readFileSync(EXAMPLE_FILE, "utf-8")) as unknown;
  return extractFigmaDocuments(raw);
}

describe("hasAutoLayout", () => {
  it("treats HORIZONTAL and VERTICAL as auto-layout", () => {
    expect(hasAutoLayout({ id: "1", name: "Row", type: "FRAME", layoutMode: "HORIZONTAL" })).toBe(true);
    expect(hasAutoLayout({ id: "2", name: "Col", type: "FRAME", layoutMode: "VERTICAL" })).toBe(true);
  });

  it("treats missing or NONE as manual layout", () => {
    expect(hasAutoLayout({ id: "3", name: "Manual", type: "FRAME" })).toBe(false);
    expect(hasAutoLayout({ id: "4", name: "Manual", type: "FRAME", layoutMode: "NONE" })).toBe(false);
  });
});

describe("resolveLayoutSeverity", () => {
  it("is strictest for flexible-layout at the scan root", () => {
    expect(resolveLayoutSeverity("flexible-layout", true)).toBe("high");
    expect(resolveLayoutSeverity("flexible-layout", false)).toBe("medium");
  });

  it("is lenient for fixed-size and skips nested frames", () => {
    expect(resolveLayoutSeverity("fixed-size", true)).toBe("low");
    expect(resolveLayoutSeverity("fixed-size", false)).toBe(null);
  });
});

describe("shouldEvaluateLayoutNode", () => {
  it("skips GROUP and single-child frames", () => {
    const group: FigmaNode = {
      id: "1",
      name: "Group",
      type: "GROUP",
      children: [{ id: "2", name: "A", type: "TEXT" }, { id: "3", name: "B", type: "TEXT" }],
    };
    expect(shouldEvaluateLayoutNode(group, [])).toBe(false);

    const frame: FigmaNode = {
      id: "4",
      name: "Wrapper",
      type: "FRAME",
      children: [{ id: "5", name: "Only", type: "TEXT" }],
    };
    expect(shouldEvaluateLayoutNode(frame, [])).toBe(false);
  });

  it("skips frames inside semantically named components", () => {
    const pincode: FigmaNode = {
      id: "2:28",
      name: "Pincode input",
      type: "COMPONENT",
    };
    const inner: FigmaNode = {
      id: "2:29",
      name: "Inner row",
      type: "FRAME",
      children: [
        { id: "2:30", name: "A", type: "TEXT" },
        { id: "2:31", name: "B", type: "TEXT" },
      ],
    };
    expect(shouldEvaluateLayoutNode(inner, [pincode])).toBe(false);
  });
});

describe("runLayoutAudit", () => {
  it("flags a manual multi-child frame under flexible-layout", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Dashboard",
      type: "FRAME",
      children: [
        { id: "1:2", name: "Header", type: "FRAME" },
        { id: "1:3", name: "Content", type: "FRAME" },
      ],
    };
    const findings = runLayoutAudit([root], {
      fileKey: FILE_KEY,
      layoutHandoffProfile: "flexible-layout",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      nodeId: "1:1",
      rule: "missing-auto-layout",
      severity: "high",
      auditTool: "layout",
    });
  });

  it("does not flag when auto-layout is enabled", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Dashboard",
      type: "FRAME",
      layoutMode: "VERTICAL",
      children: [
        { id: "1:2", name: "Header", type: "FRAME" },
        { id: "1:3", name: "Content", type: "FRAME" },
      ],
    };
    expect(
      runLayoutAudit([root], {
        fileKey: FILE_KEY,
        layoutHandoffProfile: "flexible-layout",
      }),
    ).toHaveLength(0);
  });

  it("uses lower severity for separate-screens profile", () => {
    const root: FigmaNode = {
      id: "1:1",
      name: "Mobile home",
      type: "FRAME",
      children: [
        { id: "1:2", name: "Header", type: "FRAME" },
        { id: "1:3", name: "Content", type: "FRAME" },
      ],
    };
    const findings = runLayoutAudit([root], {
      fileKey: FILE_KEY,
      layoutHandoffProfile: "separate-screens",
    });
    expect(findings[0]?.severity).toBe("medium");
  });

  it("skips nested frames for fixed-size profile", () => {
    const root: FigmaNode = {
      id: "1:0",
      name: "Desktop",
      type: "FRAME",
      children: [
        { id: "1:2", name: "Header", type: "TEXT" },
        { id: "1:3", name: "Footer", type: "TEXT" },
        {
          id: "1:1",
          name: "Section",
          type: "FRAME",
          children: [
            { id: "1:4", name: "A", type: "TEXT" },
            { id: "1:5", name: "B", type: "TEXT" },
          ],
        },
      ],
    };
    const findings = runLayoutAudit([root], {
      fileKey: FILE_KEY,
      layoutHandoffProfile: "fixed-size",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.nodeId).toBe("1:0");
    expect(findings[0]?.severity).toBe("low");
  });

  it("flags only the screen frame on example.json (legacy GROUP-based layout)", () => {
    const roots = loadExampleRoots();
    const findings = runLayoutAudit(roots, {
      fileKey: FILE_KEY,
      layoutHandoffProfile: "separate-screens",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      nodeName: "Google Pixel 2 - 1",
      severity: "medium",
      rule: "missing-auto-layout",
    });
  });
});
