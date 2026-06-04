import { buildFigmaNodeUrl } from "@/lib/figma/url";
import type { FigmaNode } from "@/lib/figma/node";
import { walkFigmaTree } from "@/lib/figma/tree";
import type { Finding } from "@/lib/types";

export type ReuseRuleId = "detached-instance";

export interface ReuseAuditOptions {
  fileKey: string;
}

/**
 * True when an INSTANCE node has lost its link to a master component.
 * In the Figma REST response, every intact INSTANCE has a non-empty `componentId`.
 * When `componentId` is absent, the instance was detached and is now a standalone
 * frame masquerading as a component — a guaranteed handoff defect.
 *
 * We deliberately do NOT flag instances whose `componentId` exists but isn't
 * present in the local file tree, because those are library/external components
 * and would produce false positives on every project using a shared library.
 */
export function isDetachedInstance(node: FigmaNode): boolean {
  return node.type === "INSTANCE" && !node.componentId;
}

function findingId(nodeId: string): string {
  const safe = nodeId.replace(/[^a-zA-Z0-9]+/g, "-");
  return `reuse-detached-instance-${safe}`;
}

function buildMessage(node: FigmaNode): string {
  return (
    `"${node.name}" is an INSTANCE that has lost its component link (no componentId) — ` +
    `re-link it to the master component or replace it with a proper instance, ` +
    `otherwise this frame will diverge from the design system silently.`
  );
}

function toFinding(node: FigmaNode, fileKey: string): Finding {
  return {
    id: findingId(node.id),
    nodeId: node.id,
    nodeName: node.name,
    auditTool: "reuse",
    severity: "medium",
    rule: "detached-instance",
    message: buildMessage(node),
    figmaUrl: buildFigmaNodeUrl(fileKey, node.id),
  };
}

/**
 * Flags INSTANCE nodes that have no `componentId`, indicating the instance was
 * detached from its master component. Detached instances look like components in
 * Figma's inspect panel but receive no design-system updates, causing drift.
 */
export function runReuseAudit(
  roots: FigmaNode[],
  options: ReuseAuditOptions,
): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    walkFigmaTree(root, (node) => {
      if (!isDetachedInstance(node)) return;

      const id = findingId(node.id);
      if (seen.has(id)) return;
      seen.add(id);

      findings.push(toFinding(node, options.fileKey));
    });
  }

  return findings;
}
