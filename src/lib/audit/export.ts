import { buildFigmaNodeUrl } from "@/lib/figma/url";
import type { FigmaExportSetting, FigmaNode } from "@/lib/figma/node";
import { walkFigmaTree } from "@/lib/figma/tree";
import type { Finding, Severity } from "@/lib/types";

const DEFAULT_MIN_RASTER_SCALE = 2;

export type ExportRuleId = "raster-missing-scale" | "raster-below-min-scale";

export interface ExportAuditOptions {
  fileKey: string;
  /** Minimum SCALE value required for PNG/JPG exports. Default: 2 (@2×). */
  minRasterScale?: number;
}

interface ExportViolation {
  rule: ExportRuleId;
  severity: Severity;
  node: FigmaNode;
  setting: FigmaExportSetting;
  settingIndex: number;
  minRasterScale: number;
}

const RASTER_FORMATS = new Set<FigmaExportSetting["format"]>(["PNG", "JPG"]);

/** Evaluate a single exportSetting entry on a node. */
export function evaluateExportSetting(
  node: FigmaNode,
  setting: FigmaExportSetting,
  settingIndex: number,
  minRasterScale: number,
): ExportViolation | null {
  if (!RASTER_FORMATS.has(setting.format)) return null;

  if (!setting.constraint) {
    return {
      rule: "raster-missing-scale",
      severity: "high",
      node,
      setting,
      settingIndex,
      minRasterScale,
    };
  }

  if (
    setting.constraint.type === "SCALE" &&
    setting.constraint.value < minRasterScale
  ) {
    return {
      rule: "raster-below-min-scale",
      severity: "medium",
      node,
      setting,
      settingIndex,
      minRasterScale,
    };
  }

  return null;
}

function findingId(
  nodeId: string,
  rule: ExportRuleId,
  settingIndex: number,
): string {
  const safe = nodeId.replace(/[^a-zA-Z0-9]+/g, "-");
  return `export-${rule}-${safe}-${settingIndex}`;
}

function buildMessage(v: ExportViolation): string {
  const { node, setting, rule, minRasterScale } = v;
  const formatLabel = setting.format;

  if (rule === "raster-missing-scale") {
    return (
      `"${node.name}" has a ${formatLabel} export with no scale constraint — ` +
      `add @${minRasterScale}× (SCALE: ${minRasterScale}) so it looks crisp on retina screens.`
    );
  }

  const actualScale = setting.constraint?.value ?? "?";
  return (
    `"${node.name}" has a ${formatLabel} export at @${actualScale}× ` +
    `(below the required @${minRasterScale}×) — ` +
    `increase the scale constraint to ${minRasterScale} for retina-ready assets.`
  );
}

function toFinding(v: ExportViolation, fileKey: string): Finding {
  return {
    id: findingId(v.node.id, v.rule, v.settingIndex),
    nodeId: v.node.id,
    nodeName: v.node.name,
    auditTool: "export",
    severity: v.severity,
    rule: v.rule,
    message: buildMessage(v),
    figmaUrl: buildFigmaNodeUrl(fileKey, v.node.id),
  };
}

/**
 * Validates export-settings entries on every node in the tree.
 *
 * Rules:
 *   - PNG/JPG with no constraint → "raster-missing-scale" (high)
 *   - PNG/JPG with SCALE < minRasterScale → "raster-below-min-scale" (medium)
 *   - SVG / PDF exports are not checked (resolution-independent or document formats).
 *
 * Only nodes that already have exportSettings are evaluated — the audit does
 * not flag nodes that simply have no export settings.
 */
export function runExportAudit(
  roots: FigmaNode[],
  options: ExportAuditOptions,
): Finding[] {
  const minRasterScale = options.minRasterScale ?? DEFAULT_MIN_RASTER_SCALE;
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    walkFigmaTree(root, (node) => {
      const settings = node.exportSettings;
      if (!settings || settings.length === 0) return;

      settings.forEach((setting, idx) => {
        const violation = evaluateExportSetting(node, setting, idx, minRasterScale);
        if (!violation) return;

        const id = findingId(node.id, violation.rule, idx);
        if (seen.has(id)) return;
        seen.add(id);

        findings.push(toFinding(violation, options.fileKey));
      });
    });
  }

  return findings;
}
