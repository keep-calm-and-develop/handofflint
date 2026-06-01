import { buildFigmaNodeUrl } from "@/lib/figma/url";
import type { FigmaNode, FigmaPaint } from "@/lib/figma/node";
import { walkFigmaTreeWithAncestors } from "@/lib/figma/tree";
import type { ContrastLevel, Finding, Severity } from "@/lib/types";
import { DEFAULT_CONTRAST_LEVEL } from "@/lib/types";

export type ContrastRuleId = "insufficient-contrast";

export interface ContrastAuditOptions {
  fileKey: string;
  contrastLevel?: ContrastLevel;
}

type TextRole = "body" | "heading" | "caption" | "decorative";

interface ContrastViolation {
  rule: ContrastRuleId;
  severity: Severity;
  node: FigmaNode;
  foreground: RgbColor;
  background: RgbColor;
  contrastRatio: number;
  requiredRatio: number;
  isLargeText: boolean;
  textRole: TextRole;
  contrastLevel: ContrastLevel;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const WHITE: RgbColor = { r: 1, g: 1, b: 1 };

const CONTRAST_RATIOS: Record<ContrastLevel, { normal: number; large: number }> = {
  standard: { normal: 3, large: 3 },
  aa: { normal: 4.5, large: 3 },
  aaa: { normal: 7, large: 4.5 },
};

const SEVERITY_BY_LEVEL: Record<
  ContrastLevel,
  Record<Exclude<TextRole, "decorative">, Severity>
> = {
  standard: { heading: "medium", body: "medium", caption: "low" },
  aa: { heading: "high", body: "high", caption: "medium" },
  aaa: { heading: "high", body: "high", caption: "medium" },
};

const LEVEL_LABELS: Record<ContrastLevel, string> = {
  standard: "Standard",
  aa: "WCAG AA",
  aaa: "WCAG AAA",
};

/** Px threshold for WCAG "large text": 18pt = 24px regular, 14pt ≈ 18.66px bold. */
const LARGE_TEXT_PX = 24;
const LARGE_TEXT_BOLD_PX = 18.66;
const BOLD_WEIGHT = 700;

/**
 * WCAG 2.1 relative luminance.
 * Input channels are in sRGB 0–1 range.
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG contrast ratio between two luminance values, always ≥ 1. */
export function contrastRatio(fgLum: number, bgLum: number): number {
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Extract the effective sRGB color from a paint, respecting opacity. */
function paintToRgb(paint: FigmaPaint): RgbColor | null {
  if (paint.type !== "SOLID" || paint.visible === false || !paint.color) {
    return null;
  }
  const { r, g, b } = paint.color;
  return { r, g, b };
}

/** First visible solid fill color from a fills array. */
export function extractSolidFill(
  fills: FigmaPaint[] | undefined,
): RgbColor | null {
  if (!fills || fills.length === 0) return null;
  for (const paint of fills) {
    const rgb = paintToRgb(paint);
    if (rgb) return rgb;
  }
  return null;
}

/**
 * Walk the ancestor chain for the nearest solid background fill.
 * Falls back to white (#FFFFFF) if no ancestor has a solid fill.
 */
export function resolveBackground(ancestors: FigmaNode[]): RgbColor {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const bg = extractSolidFill(ancestors[i].fills);
    if (bg) return bg;
  }
  return WHITE;
}

/**
 * WCAG large text: ≥24px regular OR ≥18.66px bold (fontWeight ≥ 700).
 */
export function isLargeText(fontSize?: number, fontWeight?: number): boolean {
  if (fontSize === undefined) return false;
  if (fontSize >= LARGE_TEXT_PX) return true;
  if (fontSize >= LARGE_TEXT_BOLD_PX && (fontWeight ?? 400) >= BOLD_WEIGHT)
    return true;
  return false;
}

function classifyTextRole(node: FigmaNode): TextRole {
  const chars = node.characters?.trim() ?? "";
  if (chars.length <= 1) return "decorative";

  const fontSize = node.style?.fontSize;
  const fontWeight = node.style?.fontWeight;

  if (fontSize === undefined) return "body";
  if (fontSize >= LARGE_TEXT_PX || (fontWeight ?? 400) >= BOLD_WEIGHT)
    return "heading";
  if (fontSize < 14) return "caption";
  return "body";
}

function severityForRole(
  role: Exclude<TextRole, "decorative">,
  level: ContrastLevel,
): Severity {
  return SEVERITY_BY_LEVEL[level][role];
}

function getRequiredRatio(level: ContrastLevel, large: boolean): number {
  return CONTRAST_RATIOS[level][large ? "large" : "normal"];
}

function rgbToHex(c: RgbColor): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

function roundRatio(ratio: number): number {
  return Math.round(ratio * 100) / 100;
}

function evaluateTextContrast(
  node: FigmaNode,
  ancestors: FigmaNode[],
  level: ContrastLevel,
): ContrastViolation | null {
  if (node.type !== "TEXT") return null;

  const textRole = classifyTextRole(node);
  if (textRole === "decorative") return null;

  const fg = extractSolidFill(node.fills);
  if (!fg) return null;

  const bg = resolveBackground(ancestors);

  const fgLum = relativeLuminance(fg.r, fg.g, fg.b);
  const bgLum = relativeLuminance(bg.r, bg.g, bg.b);
  const ratio = contrastRatio(fgLum, bgLum);

  const large = isLargeText(node.style?.fontSize, node.style?.fontWeight);
  const required = getRequiredRatio(level, large);

  if (ratio >= required) return null;

  return {
    rule: "insufficient-contrast",
    severity: severityForRole(textRole, level),
    node,
    foreground: fg,
    background: bg,
    contrastRatio: roundRatio(ratio),
    requiredRatio: required,
    isLargeText: large,
    textRole,
    contrastLevel: level,
  };
}

function findingId(nodeId: string): string {
  const safe = nodeId.replace(/[^a-zA-Z0-9]+/g, "-");
  return `contrast-insufficient-contrast-${safe}`;
}

function buildMessage(v: ContrastViolation): string {
  const sizeLabel = v.isLargeText ? "large text" : "normal text";
  return (
    `Text "${v.node.name}" has contrast ratio ${v.contrastRatio}:1 ` +
    `(${rgbToHex(v.foreground)} on ${rgbToHex(v.background)}), ` +
    `below the required ${v.requiredRatio}:1 (${LEVEL_LABELS[v.contrastLevel]}, ${sizeLabel}).`
  );
}

function toFinding(v: ContrastViolation, fileKey: string): Finding {
  return {
    id: findingId(v.node.id),
    nodeId: v.node.id,
    nodeName: v.node.name,
    auditTool: "contrast",
    severity: v.severity,
    rule: v.rule,
    message: buildMessage(v),
    figmaUrl: buildFigmaNodeUrl(fileKey, v.node.id),
  };
}

/**
 * Flags TEXT nodes whose foreground fill has insufficient contrast against the
 * nearest ancestor solid background, per WCAG 2.1 luminance math.
 * Thresholds and severity adjust based on the chosen contrast level.
 */
export function runContrastAudit(
  roots: FigmaNode[],
  options: ContrastAuditOptions,
): Finding[] {
  const level = options.contrastLevel ?? DEFAULT_CONTRAST_LEVEL;
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    walkFigmaTreeWithAncestors(root, (node, ancestors) => {
      const violation = evaluateTextContrast(node, ancestors, level);
      if (!violation) return;

      const id = findingId(node.id);
      if (seen.has(id)) return;
      seen.add(id);

      findings.push(toFinding(violation, options.fileKey));
    });
  }

  return findings;
}
