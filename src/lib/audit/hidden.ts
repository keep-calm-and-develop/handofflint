import { buildFigmaNodeUrl } from "@/lib/figma/url";
import type { FigmaNode } from "@/lib/figma/node";
import { walkFigmaTreeWithAncestors } from "@/lib/figma/tree";
import type { Finding, Severity } from "@/lib/types";

const COMPONENT_TYPES = new Set(["COMPONENT", "INSTANCE"]);

export type HiddenRuleId = "hidden-top-level-layer" | "hidden-nested-layer";

export interface HiddenAuditOptions {
  fileKey: string;
}

interface HiddenViolation {
  rule: HiddenRuleId;
  severity: Severity;
  node: FigmaNode;
}

export function isNodeVisible(node: FigmaNode): boolean {
  return node.visible !== false;
}

export function isInsideComponentOrInstance(ancestors: FigmaNode[]): boolean {
  return ancestors.some((a) => COMPONENT_TYPES.has(a.type));
}

export function resolveHiddenSeverity(ancestors: FigmaNode[]): Severity {
  return ancestors.length <= 1 ? "medium" : "low";
}

function evaluateNodeVisibility(
  node: FigmaNode,
  ancestors: FigmaNode[],
): HiddenViolation | null {
  if (isNodeVisible(node)) {
    return null;
  }
  if (isInsideComponentOrInstance(ancestors)) {
    return null;
  }

  const severity = resolveHiddenSeverity(ancestors);
  const rule: HiddenRuleId =
    ancestors.length <= 1 ? "hidden-top-level-layer" : "hidden-nested-layer";

  return { rule, severity, node };
}

function findingId(nodeId: string, rule: HiddenRuleId): string {
  const safe = nodeId.replace(/[^a-zA-Z0-9]+/g, "-");
  return `hidden-${rule}-${safe}`;
}

function buildMessage(violation: HiddenViolation): string {
  const { node, rule } = violation;
  if (rule === "hidden-top-level-layer") {
    return `Layer "${node.name}" is hidden at the top level — remove or unhide before handoff to avoid shipping dead code.`;
  }
  return `Layer "${node.name}" is hidden inside a visible parent — verify it is not leftover debug/draft content.`;
}

function toFinding(violation: HiddenViolation, fileKey: string): Finding {
  const { node, rule, severity } = violation;
  return {
    id: findingId(node.id, rule),
    nodeId: node.id,
    nodeName: node.name,
    auditTool: "hidden",
    severity,
    rule,
    message: buildMessage(violation),
    figmaUrl: buildFigmaNodeUrl(fileKey, node.id),
  };
}

/**
 * Flags hidden (invisible) layers that are likely leftover junk rather than
 * intentional variant states. Skips hidden children inside COMPONENT/INSTANCE
 * nodes since those represent design variants.
 */
export function runHiddenAudit(
  roots: FigmaNode[],
  options: HiddenAuditOptions,
): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    walkFigmaTreeWithAncestors(root, (node, ancestors) => {
      const violation = evaluateNodeVisibility(node, ancestors);
      if (!violation) {
        return;
      }

      const id = findingId(node.id, violation.rule);
      if (seen.has(id)) {
        return;
      }
      seen.add(id);

      findings.push(toFinding(violation, options.fileKey));
    });
  }

  return findings;
}
