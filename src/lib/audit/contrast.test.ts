import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  extractSolidFill,
  isLargeText,
  relativeLuminance,
  resolveBackground,
  runContrastAudit,
} from "@/lib/audit/contrast";
import type { FigmaNode } from "@/lib/figma/node";

const FILE_KEY = "test-file-key";

function textNode(
  overrides: Partial<FigmaNode> & { id: string; name: string },
): FigmaNode {
  return { type: "TEXT", ...overrides };
}

function solidFill(r: number, g: number, b: number) {
  return [{ type: "SOLID" as const, color: { r, g, b, a: 1 } }];
}

// ---------- Unit: relativeLuminance ----------

describe("relativeLuminance", () => {
  it("returns 1 for white", () => {
    expect(relativeLuminance(1, 1, 1)).toBeCloseTo(1, 4);
  });

  it("returns 0 for black", () => {
    expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0, 4);
  });

  it("returns ~0.2126 for pure red", () => {
    expect(relativeLuminance(1, 0, 0)).toBeCloseTo(0.2126, 3);
  });
});

// ---------- Unit: contrastRatio ----------

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    const black = relativeLuminance(0, 0, 0);
    const white = relativeLuminance(1, 1, 1);
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
  });

  it("returns 1 for same color", () => {
    const lum = relativeLuminance(0.5, 0.5, 0.5);
    expect(contrastRatio(lum, lum)).toBeCloseTo(1, 2);
  });

  it("order of arguments does not matter", () => {
    const dark = relativeLuminance(0.2, 0.2, 0.2);
    const light = relativeLuminance(0.8, 0.8, 0.8);
    expect(contrastRatio(dark, light)).toBe(contrastRatio(light, dark));
  });
});

// ---------- Unit: extractSolidFill ----------

describe("extractSolidFill", () => {
  it("returns null for undefined fills", () => {
    expect(extractSolidFill(undefined)).toBeNull();
  });

  it("returns null for empty fills array", () => {
    expect(extractSolidFill([])).toBeNull();
  });

  it("extracts color from a SOLID fill", () => {
    const fills = solidFill(0.6, 0.6, 0.6);
    expect(extractSolidFill(fills)).toEqual({ r: 0.6, g: 0.6, b: 0.6 });
  });

  it("skips non-SOLID fills", () => {
    const fills = [
      { type: "GRADIENT_LINEAR" },
      { type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } },
    ];
    expect(extractSolidFill(fills)).toEqual({ r: 1, g: 0, b: 0 });
  });

  it("skips fills where visible is false", () => {
    const fills = [
      { type: "SOLID", visible: false, color: { r: 1, g: 0, b: 0, a: 1 } },
    ];
    expect(extractSolidFill(fills)).toBeNull();
  });
});

// ---------- Unit: resolveBackground ----------

describe("resolveBackground", () => {
  it("returns nearest ancestor solid fill", () => {
    const parent: FigmaNode = {
      id: "p", name: "Parent", type: "FRAME",
      fills: solidFill(0.9, 0.9, 0.9),
    };
    expect(resolveBackground([parent])).toEqual({ r: 0.9, g: 0.9, b: 0.9 });
  });

  it("skips ancestors without solid fills", () => {
    const grandparent: FigmaNode = {
      id: "gp", name: "GP", type: "FRAME",
      fills: solidFill(0.2, 0.2, 0.2),
    };
    const parent: FigmaNode = {
      id: "p", name: "Parent", type: "FRAME",
      fills: [],
    };
    expect(resolveBackground([grandparent, parent])).toEqual({ r: 0.2, g: 0.2, b: 0.2 });
  });

  it("falls back to white when no ancestor has a solid fill", () => {
    expect(resolveBackground([])).toEqual({ r: 1, g: 1, b: 1 });
  });
});

// ---------- Unit: isLargeText ----------

describe("isLargeText", () => {
  it("returns true for ≥24px regular weight", () => {
    expect(isLargeText(24, 400)).toBe(true);
    expect(isLargeText(30, 400)).toBe(true);
  });

  it("returns true for ≥18.66px and bold weight", () => {
    expect(isLargeText(19, 700)).toBe(true);
    expect(isLargeText(18.66, 700)).toBe(true);
  });

  it("returns false for 18.66px with regular weight", () => {
    expect(isLargeText(18.66, 400)).toBe(false);
  });

  it("returns false for small text", () => {
    expect(isLargeText(14, 400)).toBe(false);
    expect(isLargeText(16, 400)).toBe(false);
  });

  it("returns false when fontSize is undefined", () => {
    expect(isLargeText(undefined, 700)).toBe(false);
  });
});

// ---------- Integration: runContrastAudit ----------

describe("runContrastAudit", () => {
  // --- Positive case: must flag (AA default) ---
  it("flags light gray text on white background as high severity (AA)", () => {
    const frame: FigmaNode = {
      id: "f:1", name: "Card", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:1", name: "Label",
          fills: solidFill(0.6, 0.6, 0.6),
          style: { fontSize: 16, fontWeight: 400 },
          characters: "Login",
        }),
      ],
    };

    const findings = runContrastAudit([frame], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      nodeId: "t:1",
      nodeName: "Label",
      auditTool: "contrast",
      severity: "high",
      rule: "insufficient-contrast",
    });
    expect(findings[0].message).toContain("contrast ratio");
    expect(findings[0].message).toContain("WCAG AA");
    expect(findings[0].message).toContain("4.5:1");
  });

  // --- Negative case: must NOT flag ---
  it("does not flag black text on white (21:1 passes all levels)", () => {
    const frame: FigmaNode = {
      id: "f:1", name: "Card", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:1", name: "Title",
          fills: solidFill(0, 0, 0),
          style: { fontSize: 16, fontWeight: 400 },
          characters: "Hello World",
        }),
      ],
    };

    const findings = runContrastAudit([frame], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  // --- Boundary: large text threshold ---
  it("passes large text (≥24px) at 3:1+ ratio that would fail for normal text", () => {
    // Gray on white: ratio ≈ 3.47:1
    // Passes large text (3:1) but fails normal text (4.5:1)
    const darkGray = { r: 0.54, g: 0.54, b: 0.54 };
    const frame: FigmaNode = {
      id: "f:1", name: "Hero", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:large", name: "Heading",
          fills: [{ type: "SOLID", color: { ...darkGray, a: 1 } }],
          style: { fontSize: 24, fontWeight: 400 },
          characters: "Big Heading",
        }),
        textNode({
          id: "t:small", name: "Body",
          fills: [{ type: "SOLID", color: { ...darkGray, a: 1 } }],
          style: { fontSize: 14, fontWeight: 400 },
          characters: "Body text here",
        }),
      ],
    };

    const findings = runContrastAudit([frame], { fileKey: FILE_KEY });
    const ids = findings.map((f) => f.nodeId);
    expect(ids).not.toContain("t:large");
    expect(ids).toContain("t:small");
  });

  // --- Boundary: bold large text ---
  it("treats bold text ≥18.66px as large text", () => {
    // Same gray as above: ~3.47:1, passes for large text (bold ≥18.66px)
    const darkGray = { r: 0.54, g: 0.54, b: 0.54 };
    const frame: FigmaNode = {
      id: "f:1", name: "Section", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:1", name: "Bold Label",
          fills: [{ type: "SOLID", color: { ...darkGray, a: 1 } }],
          style: { fontSize: 19, fontWeight: 700 },
          characters: "Bold Text",
        }),
      ],
    };

    const findings = runContrastAudit([frame], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  // --- Edge: text with empty fills (no foreground) ---
  it("skips text nodes with empty fills", () => {
    const frame: FigmaNode = {
      id: "f:1", name: "Card", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:1", name: "Ghost",
          fills: [],
          style: { fontSize: 16 },
          characters: "Invisible",
        }),
      ],
    };

    const findings = runContrastAudit([frame], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  // --- Edge: non-TEXT nodes are skipped ---
  it("does not audit non-TEXT nodes", () => {
    const frame: FigmaNode = {
      id: "f:1", name: "Box", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        { id: "r:1", name: "Rect", type: "RECTANGLE", fills: solidFill(0.6, 0.6, 0.6) },
      ],
    };

    const findings = runContrastAudit([frame], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  // --- Edge: decorative (single char) text is skipped ---
  it("skips single-character text nodes (decorative)", () => {
    const frame: FigmaNode = {
      id: "f:1", name: "Icon", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:1", name: "Arrow",
          fills: solidFill(0.6, 0.6, 0.6),
          style: { fontSize: 16 },
          characters: "→",
        }),
      ],
    };

    const findings = runContrastAudit([frame], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  // --- Background: falls back to white ---
  it("falls back to white background when no ancestor has a solid fill", () => {
    const frame: FigmaNode = {
      id: "f:1", name: "Transparent", type: "FRAME",
      fills: [],
      children: [
        textNode({
          id: "t:1", name: "Dim",
          fills: solidFill(0.6, 0.6, 0.6),
          style: { fontSize: 16 },
          characters: "Faded text",
        }),
      ],
    };

    const findings = runContrastAudit([frame], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("#ffffff");
  });

  // --- 3-tier: Standard level ---
  it("Standard level only flags ratio below 3:1", () => {
    // ~2.62:1 ratio — fails Standard (3:1)
    const frame: FigmaNode = {
      id: "f:1", name: "Card", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:1", name: "Faint",
          fills: solidFill(0.6, 0.6, 0.6),
          style: { fontSize: 16, fontWeight: 400 },
          characters: "Low contrast",
        }),
      ],
    };

    const findings = runContrastAudit([frame], {
      fileKey: FILE_KEY,
      contrastLevel: "standard",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("medium");
    expect(findings[0].message).toContain("Standard");
    expect(findings[0].message).toContain("3:1");
  });

  it("Standard level does NOT flag text with ratio above 3:1", () => {
    // ~3.47:1 ratio — passes Standard (3:1) for normal text
    const frame: FigmaNode = {
      id: "f:1", name: "Card", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:1", name: "Okay",
          fills: solidFill(0.54, 0.54, 0.54),
          style: { fontSize: 16, fontWeight: 400 },
          characters: "Readable text",
        }),
      ],
    };

    const findings = runContrastAudit([frame], {
      fileKey: FILE_KEY,
      contrastLevel: "standard",
    });
    expect(findings).toHaveLength(0);
  });

  // --- 3-tier: AAA level ---
  it("AAA flags text that passes AA but fails AAA", () => {
    // ~5:1 ratio — passes AA normal (4.5) but fails AAA normal (7)
    const medGray = { r: 0.35, g: 0.35, b: 0.35 };
    const frame: FigmaNode = {
      id: "f:1", name: "Page", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:1", name: "Subtitle",
          fills: [{ type: "SOLID", color: { ...medGray, a: 1 } }],
          style: { fontSize: 16, fontWeight: 400 },
          characters: "Some subtitle",
        }),
      ],
    };

    const findingsAA = runContrastAudit([frame], { fileKey: FILE_KEY, contrastLevel: "aa" });
    expect(findingsAA).toHaveLength(0);

    const findingsAAA = runContrastAudit([frame], { fileKey: FILE_KEY, contrastLevel: "aaa" });
    expect(findingsAAA).toHaveLength(1);
    expect(findingsAAA[0].message).toContain("WCAG AAA");
    expect(findingsAAA[0].message).toContain("7:1");
  });

  // --- Severity: Standard uses lower severity ---
  it("Standard assigns medium severity to body text (not high)", () => {
    const frame: FigmaNode = {
      id: "f:1", name: "Card", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:1", name: "Body",
          fills: solidFill(0.6, 0.6, 0.6),
          style: { fontSize: 16, fontWeight: 400 },
          characters: "Body text",
        }),
      ],
    };

    const standard = runContrastAudit([frame], { fileKey: FILE_KEY, contrastLevel: "standard" });
    expect(standard[0].severity).toBe("medium");

    const aa = runContrastAudit([frame], { fileKey: FILE_KEY, contrastLevel: "aa" });
    expect(aa[0].severity).toBe("high");
  });

  // --- Dedup ---
  it("does not duplicate findings for the same node across roots", () => {
    const node = textNode({
      id: "t:1", name: "Dup",
      fills: solidFill(0.6, 0.6, 0.6),
      style: { fontSize: 16 },
      characters: "Dup text",
    });
    const frame: FigmaNode = {
      id: "f:1", name: "Frame", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [node],
    };

    const findings = runContrastAudit([frame, frame], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
  });

  // --- Nested background resolution ---
  it("uses nearest ancestor's fill for background", () => {
    const outer: FigmaNode = {
      id: "f:outer", name: "Page", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [{
        id: "f:inner", name: "DarkCard", type: "FRAME",
        fills: solidFill(0.1, 0.1, 0.1),
        children: [
          textNode({
            id: "t:1", name: "Light Text",
            fills: solidFill(0.95, 0.95, 0.95),
            style: { fontSize: 16 },
            characters: "On dark bg",
          }),
        ],
      }],
    };

    const findings = runContrastAudit([outer], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(0);
  });

  // --- Caption severity by level ---
  it("assigns medium severity to captions at AA, low at Standard", () => {
    const frame: FigmaNode = {
      id: "f:1", name: "Card", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:1", name: "Fine Print",
          fills: solidFill(0.6, 0.6, 0.6),
          style: { fontSize: 12, fontWeight: 400 },
          characters: "Terms apply",
        }),
      ],
    };

    const aa = runContrastAudit([frame], { fileKey: FILE_KEY, contrastLevel: "aa" });
    expect(aa).toHaveLength(1);
    expect(aa[0].severity).toBe("medium");

    const standard = runContrastAudit([frame], { fileKey: FILE_KEY, contrastLevel: "standard" });
    expect(standard).toHaveLength(1);
    expect(standard[0].severity).toBe("low");
  });

  // --- Default level is AA ---
  it("defaults to AA when no contrastLevel is specified", () => {
    const frame: FigmaNode = {
      id: "f:1", name: "Card", type: "FRAME",
      fills: solidFill(1, 1, 1),
      children: [
        textNode({
          id: "t:1", name: "Text",
          fills: solidFill(0.6, 0.6, 0.6),
          style: { fontSize: 16 },
          characters: "Default level",
        }),
      ],
    };

    const findings = runContrastAudit([frame], { fileKey: FILE_KEY });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("WCAG AA");
  });
});
