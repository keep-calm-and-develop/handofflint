import { hasAutoLayout } from "@/lib/audit/layout";
import { buildFigmaNodeUrl } from "@/lib/figma/url";
import type { FigmaNode } from "@/lib/figma/node";
import { walkFigmaTreeWithAncestors } from "@/lib/figma/tree";
import type { Finding, Severity } from "@/lib/types";

const DEFAULT_GRID_BASE = 4;

export type SpacingRuleId = "off-grid-spacing" | "zero-spacing";

export interface SpacingAuditOptions {
  fileKey: string;
  gridBase?: number;
}

interface SpacingViolation {
  rule: SpacingRuleId;
  severity: Severity;
  node: FigmaNode;
  property: string;
  value: number;
  gridBase: number;
}

export function isAutoLayoutFrame(node: FigmaNode): boolean {
  return hasAutoLayout(node);
}

export function isOnGrid(value: number, gridBase: number): boolean {
  return value % gridBase === 0;
}

const SPACING_PROPERTIES = [
  "itemSpacing",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingBottom",
] as const;

type SpacingProperty = (typeof SPACING_PROPERTIES)[number];

function getSpacingValue(node: FigmaNode, prop: SpacingProperty): number | undefined {
  return node[prop];
}

function evaluateSpacingProperty(
  node: FigmaNode,
  prop: SpacingProperty,
  gridBase: number,
): SpacingViolation | null {
  const value = getSpacingValue(node, prop);
  if (value === undefined) {
    return null;
  }

  if (value === 0) {
    return {
      rule: "zero-spacing",
      severity: "low",
      node,
      property: prop,
      value,
      gridBase,
    };
  }

  if (!isOnGrid(value, gridBase)) {
    return {
      rule: "off-grid-spacing",
      severity: "medium",
      node,
      property: prop,
      value,
      gridBase,
    };
  }

  return null;
}

function findingId(nodeId: string, rule: SpacingRuleId, property: string): string {
  const safe = nodeId.replace(/[^a-zA-Z0-9]+/g, "-");
  return `spacing-${rule}-${safe}-${property}`;
}

function buildMessage(violation: SpacingViolation): string {
  const { node, rule, property, value, gridBase } = violation;
  if (rule === "zero-spacing") {
    return `Frame "${node.name}" has ${property} set to 0 — verify this is intentional and not a missed spacing value.`;
  }
  return `Frame "${node.name}" has ${property}: ${value}px which is not a multiple of the ${gridBase}px grid.`;
}

function toFinding(violation: SpacingViolation, fileKey: string): Finding {
  const { node, rule, severity, property } = violation;
  return {
    id: findingId(node.id, rule, property),
    nodeId: node.id,
    nodeName: node.name,
    auditTool: "spacing",
    severity,
    rule,
    message: buildMessage(violation),
    figmaUrl: buildFigmaNodeUrl(fileKey, node.id),
  };
}

/**
 * Flags spacing values (itemSpacing, padding) that violate the grid base.
 * Only audits auto-layout frames where spacing values are semantically meaningful.
 */
export function runSpacingAudit(
  roots: FigmaNode[],
  options: SpacingAuditOptions,
): Finding[] {
  const gridBase = options.gridBase ?? DEFAULT_GRID_BASE;
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    walkFigmaTreeWithAncestors(root, (node) => {
      if (!isAutoLayoutFrame(node)) {
        return;
      }

      for (const prop of SPACING_PROPERTIES) {
        const violation = evaluateSpacingProperty(node, prop, gridBase);
        if (!violation) {
          continue;
        }

        const id = findingId(node.id, violation.rule, prop);
        if (seen.has(id)) {
          continue;
        }
        seen.add(id);

        findings.push(toFinding(violation, options.fileKey));
      }
    });
  }

  return findings;
}
