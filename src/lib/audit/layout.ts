import { isInsideSemanticContainer } from "@/lib/audit/naming";
import { buildFigmaNodeUrl } from "@/lib/figma/url";
import type { FigmaNode } from "@/lib/figma/node";
import { walkFigmaTreeWithAncestors } from "@/lib/figma/tree";
import type { Finding, LayoutHandoffProfile, Severity } from "@/lib/types";
import { DEFAULT_LAYOUT_HANDOFF_PROFILE } from "@/lib/types";

export const LAYOUT_CONTAINER_TYPES = new Set([
  "FRAME",
  "COMPONENT",
  "INSTANCE",
]);

export type LayoutRuleId = "missing-auto-layout";

export interface LayoutAuditOptions {
  fileKey: string;
  layoutHandoffProfile?: LayoutHandoffProfile;
}

interface LayoutViolation {
  rule: LayoutRuleId;
  severity: Severity;
  node: FigmaNode;
  childCount: number;
  layoutHandoffProfile: LayoutHandoffProfile;
}

export function hasAutoLayout(node: FigmaNode): boolean {
  const mode = node.layoutMode;
  return mode !== undefined && mode !== "NONE";
}

export function shouldEvaluateLayoutNode(
  node: FigmaNode,
  ancestors: FigmaNode[],
): boolean {
  if (!LAYOUT_CONTAINER_TYPES.has(node.type)) {
    return false;
  }
  if (isInsideSemanticContainer(ancestors)) {
    return false;
  }
  return (node.children ?? []).length >= 2;
}

export function resolveLayoutSeverity(
  profile: LayoutHandoffProfile,
  isScanRoot: boolean,
): Severity | null {
  if (profile === "fixed-size") {
    return isScanRoot ? "low" : null;
  }
  if (profile === "separate-screens") {
    return isScanRoot ? "medium" : "low";
  }
  // flexible-layout
  return isScanRoot ? "high" : "medium";
}

function evaluateNodeLayout(
  node: FigmaNode,
  ancestors: FigmaNode[],
  profile: LayoutHandoffProfile,
): LayoutViolation | null {
  if (!shouldEvaluateLayoutNode(node, ancestors)) {
    return null;
  }
  if (hasAutoLayout(node)) {
    return null;
  }

  const isScanRoot = ancestors.length === 0;
  const severity = resolveLayoutSeverity(profile, isScanRoot);
  if (severity === null) {
    return null;
  }

  return {
    rule: "missing-auto-layout",
    severity,
    node,
    childCount: (node.children ?? []).length,
    layoutHandoffProfile: profile,
  };
}

function findingId(nodeId: string, rule: LayoutRuleId): string {
  const safe = nodeId.replace(/[^a-zA-Z0-9]+/g, "-");
  return `layout-${rule}-${safe}`;
}

function buildMessage(violation: LayoutViolation): string {
  const { node, childCount } = violation;
  return `Frame "${node.name}" has ${childCount} layers but no auto-layout — turn on auto-layout so spacing and stacking are clear for build.`;
}

function toFinding(violation: LayoutViolation, fileKey: string): Finding {
  const { node, rule, severity } = violation;
  return {
    id: findingId(node.id, rule),
    nodeId: node.id,
    nodeName: node.name,
    auditTool: "layout",
    severity,
    rule,
    message: buildMessage(violation),
    figmaUrl: buildFigmaNodeUrl(fileKey, node.id),
  };
}

/**
 * Flags FRAME/COMPONENT/INSTANCE containers with multiple children still on
 * manual layout. Severity depends on the user's layout handoff profile.
 */
export function runLayoutAudit(
  roots: FigmaNode[],
  options: LayoutAuditOptions,
): Finding[] {
  const profile =
    options.layoutHandoffProfile ?? DEFAULT_LAYOUT_HANDOFF_PROFILE;
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    walkFigmaTreeWithAncestors(root, (node, ancestors) => {
      const violation = evaluateNodeLayout(node, ancestors, profile);
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
