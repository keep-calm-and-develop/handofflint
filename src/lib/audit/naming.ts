import { buildFigmaNodeUrl } from "@/lib/figma/url";
import type { FigmaNode } from "@/lib/figma/node";
import { walkFigmaTreeWithAncestors } from "@/lib/figma/tree";
import type { Finding, Severity } from "@/lib/types";

/** Figma default names like "Rectangle 42", "Line 3". */
export const DEFAULT_LAYER_NAME_PATTERN =
  /^(Rectangle|Frame|Group|Ellipse|Line|Vector|Text|Component|Instance|Section) \d+$/;

/** Standalone generic names Figma assigns without a numeric suffix. */
export const GENERIC_LAYER_NAME_PATTERN = /^Vector$/;

/** B: always evaluate naming on these handoff-relevant types. */
export const STRUCTURAL_NODE_TYPES = new Set([
  "FRAME",
  "GROUP",
  "COMPONENT",
  "INSTANCE",
  "TEXT",
  "SECTION",
]);

/** Primitive/decoration types — A: skip when inside a semantic container. */
export const PRIMITIVE_NODE_TYPES = new Set([
  "RECTANGLE",
  "LINE",
  "VECTOR",
  "ELLIPSE",
  "STAR",
  "POLYGON",
  "BOOLEAN_OPERATION",
]);

/** A: ancestors of these types can shield primitive children from naming flags. */
export const SEMANTIC_CONTAINER_TYPES = new Set([
  "FRAME",
  "COMPONENT",
  "INSTANCE",
  "GROUP",
]);

export type NamingRuleId =
  | "default-layer-name"
  | "generic-layer-name"
  | "empty-layer-name";

export interface NamingAuditOptions {
  fileKey: string;
}

interface NamingViolation {
  rule: NamingRuleId;
  severity: Severity;
  node: FigmaNode;
  matchedPattern: string;
  expectedPattern: string;
}

export function isSemanticLayerName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed === "") {
    return false;
  }
  if (DEFAULT_LAYER_NAME_PATTERN.test(trimmed)) {
    return false;
  }
  if (GENERIC_LAYER_NAME_PATTERN.test(trimmed)) {
    return false;
  }
  return true;
}

function isInsideSemanticContainer(ancestors: FigmaNode[]): boolean {
  return ancestors.some(
    (ancestor) =>
      SEMANTIC_CONTAINER_TYPES.has(ancestor.type) &&
      isSemanticLayerName(ancestor.name),
  );
}

/**
 * B + A: structural types are always checked; primitives are skipped under
 * a semantically named FRAME, COMPONENT, INSTANCE, or GROUP.
 */
export function shouldEvaluateNodeNaming(
  node: FigmaNode,
  ancestors: FigmaNode[],
): boolean {
  if (STRUCTURAL_NODE_TYPES.has(node.type)) {
    return true;
  }
  if (PRIMITIVE_NODE_TYPES.has(node.type)) {
    return !isInsideSemanticContainer(ancestors);
  }
  return !isInsideSemanticContainer(ancestors);
}

function evaluateNodeName(node: FigmaNode): NamingViolation | null {
  const name = node.name;

  if (name.trim() === "") {
    return {
      rule: "empty-layer-name",
      severity: "high",
      node,
      matchedPattern: "(empty)",
      expectedPattern: "non-empty semantic name",
    };
  }

  if (DEFAULT_LAYER_NAME_PATTERN.test(name)) {
    return {
      rule: "default-layer-name",
      severity: "medium",
      node,
      matchedPattern: DEFAULT_LAYER_NAME_PATTERN.source,
      expectedPattern: "semantic role name (e.g. primary-cta-background)",
    };
  }

  if (GENERIC_LAYER_NAME_PATTERN.test(name)) {
    return {
      rule: "generic-layer-name",
      severity: "medium",
      node,
      matchedPattern: "^Vector$",
      expectedPattern: "semantic role name (e.g. menu-icon-path)",
    };
  }

  return null;
}

function findingId(nodeId: string, rule: NamingRuleId): string {
  const safe = nodeId.replace(/[^a-zA-Z0-9]+/g, "-");
  return `naming-${rule}-${safe}`;
}

function buildMessage(violation: NamingViolation): string {
  const { node, rule } = violation;

  if (rule === "empty-layer-name") {
    return "Layer has no name — add a semantic name before handoff.";
  }

  if (rule === "generic-layer-name") {
    return `Layer name "${node.name}" is a generic Figma default — rename to describe role (e.g. "menu-icon-path").`;
  }

  return `Layer name "${node.name}" is not semantic — rename to describe role (e.g. "primary-cta-background").`;
}

function toFinding(violation: NamingViolation, fileKey: string): Finding {
  const { node, rule, severity } = violation;
  return {
    id: findingId(node.id, rule),
    nodeId: node.id,
    nodeName: node.name,
    auditTool: "naming",
    severity,
    rule,
    message: buildMessage(violation),
    figmaUrl: buildFigmaNodeUrl(fileKey, node.id),
  };
}

/**
 * Deterministic naming audit with B+A policy:
 * - B: default/generic names on structural layers (FRAME, GROUP, COMPONENT, …)
 * - A: primitives (RECTANGLE, LINE, VECTOR, …) skipped under semantic containers
 */
export function runNamingAudit(
  roots: FigmaNode[],
  options: NamingAuditOptions,
): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    walkFigmaTreeWithAncestors(root, (node, ancestors) => {
      if (!shouldEvaluateNodeNaming(node, ancestors)) {
        return;
      }

      const violation = evaluateNodeName(node);
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
