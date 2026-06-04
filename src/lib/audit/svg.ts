import { buildFigmaNodeUrl } from "@/lib/figma/url";
import type { FigmaConstraints, FigmaNode } from "@/lib/figma/node";
import { walkFigmaTreeWithAncestors } from "@/lib/figma/tree";
import type { Finding, Severity } from "@/lib/types";

export type SvgRuleId = "absolute-positioned-svg-child";

export interface SvgAuditOptions {
  fileKey: string;
}

interface SvgViolation {
  rule: SvgRuleId;
  severity: Severity;
  node: FigmaNode;
  parentName: string;
  constraintH: FigmaConstraints["horizontal"];
  constraintV: FigmaConstraints["vertical"];
  pinnedAxes: number;
}

/** Horizontal constraint values that produce fixed-pixel positioning. */
const HARD_PINNED_H = new Set<FigmaConstraints["horizontal"]>([
  "LEFT",
  "RIGHT",
  "CENTER",
]);

/** Vertical constraint values that produce fixed-pixel positioning. */
const HARD_PINNED_V = new Set<FigmaConstraints["vertical"]>([
  "TOP",
  "BOTTOM",
  "CENTER",
]);

/** Count how many axes are hard-pinned (0, 1, or 2). */
export function pinnedAxisCount(constraints: FigmaConstraints): number {
  return (HARD_PINNED_H.has(constraints.horizontal) ? 1 : 0) +
    (HARD_PINNED_V.has(constraints.vertical) ? 1 : 0);
}

/** True when the node carries at least one SVG export setting. */
export function isSvgExportMarked(node: FigmaNode): boolean {
  return (node.exportSettings ?? []).some((s) => s.format === "SVG");
}

/** True for vector leaf nodes (no children) that may later be exported as SVG. */
export function isVectorLeaf(node: FigmaNode): boolean {
  return (
    (node.type === "VECTOR" || node.type === "BOOLEAN_OPERATION") &&
    (!node.children || node.children.length === 0)
  );
}

function evaluateNodeForSvgAudit(
  node: FigmaNode,
  ancestors: FigmaNode[],
): SvgViolation | null {
  if (!node.constraints) return null;

  const pinned = pinnedAxisCount(node.constraints);
  if (pinned === 0) return null;

  const parent = ancestors[ancestors.length - 1];
  const isExportChild = parent ? isSvgExportMarked(parent) : false;

  if (isExportChild) {
    return {
      rule: "absolute-positioned-svg-child",
      severity: pinned === 2 ? "high" : "medium",
      node,
      parentName: parent.name,
      constraintH: node.constraints.horizontal,
      constraintV: node.constraints.vertical,
      pinnedAxes: pinned,
    };
  }

  if (isVectorLeaf(node)) {
    return {
      rule: "absolute-positioned-svg-child",
      severity: "low",
      node,
      parentName: parent?.name ?? "(root)",
      constraintH: node.constraints.horizontal,
      constraintV: node.constraints.vertical,
      pinnedAxes: pinned,
    };
  }

  return null;
}

function findingId(nodeId: string): string {
  const safe = nodeId.replace(/[^a-zA-Z0-9]+/g, "-");
  return `svg-absolute-positioned-svg-child-${safe}`;
}

function buildMessage(v: SvgViolation): string {
  const axisDesc =
    v.pinnedAxes === 2 ? "both axes" : "one axis";
  return (
    `"${v.node.name}" inside "${v.parentName}" has fixed-pixel constraints ` +
    `(horizontal: ${v.constraintH}, vertical: ${v.constraintV}) on ${axisDesc} — ` +
    `change to SCALE so the asset resizes correctly when exported as SVG.`
  );
}

function toFinding(v: SvgViolation, fileKey: string): Finding {
  return {
    id: findingId(v.node.id),
    nodeId: v.node.id,
    nodeName: v.node.name,
    auditTool: "svg",
    severity: v.severity,
    rule: v.rule,
    message: buildMessage(v),
    figmaUrl: buildFigmaNodeUrl(fileKey, v.node.id),
  };
}

/**
 * Flags vector/shape children whose constraints are hard-pinned (LEFT/RIGHT/CENTER
 * or TOP/BOTTOM/CENTER) rather than SCALE, causing them to misalign when the
 * exported SVG is resized in code.
 *
 * Primary scope: direct children of nodes with exportSettings[].format === "SVG".
 * Secondary scope (advisory): standalone VECTOR/BOOLEAN_OPERATION leaf nodes
 *   anywhere in the tree (low severity — heuristic only).
 */
export function runSvgAudit(
  roots: FigmaNode[],
  options: SvgAuditOptions,
): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    walkFigmaTreeWithAncestors(root, (node, ancestors) => {
      const violation = evaluateNodeForSvgAudit(node, ancestors);
      if (!violation) return;

      const id = findingId(node.id);
      if (seen.has(id)) return;
      seen.add(id);

      findings.push(toFinding(violation, options.fileKey));
    });
  }

  return findings;
}
