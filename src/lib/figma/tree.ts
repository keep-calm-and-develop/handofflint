import type { FigmaNode } from "@/lib/figma/node";

/** Extract document root(s) from a file or file-nodes API response. */
export function extractFigmaDocuments(data: unknown): FigmaNode[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const root = data as Record<string, unknown>;

  if (isFigmaNode(root.document)) {
    return [root.document];
  }

  if (root.nodes && typeof root.nodes === "object") {
    return Object.values(root.nodes as Record<string, unknown>)
      .map((entry) => normalizeNodeEntry(entry))
      .filter((doc): doc is FigmaNode => doc != null);
  }

  return [];
}

export function isFigmaNode(value: unknown): value is FigmaNode {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.type === "string"
  );
}

function normalizeNodeEntry(entry: unknown): FigmaNode | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const record = entry as Record<string, unknown>;

  if (record.document && typeof record.document === "object") {
    return isFigmaNode(record.document) ? record.document : null;
  }

  // Some payloads expose the node directly under nodes[id]
  return isFigmaNode(record) ? record : null;
}

/** Count nodes in all document roots (for audit diagnostics). */
export function countFigmaNodes(roots: FigmaNode[]): number {
  let count = 0;
  for (const root of roots) {
    walkFigmaTree(root, () => {
      count += 1;
    });
  }
  return count;
}

/** Depth-first walk including the root node. */
export function walkFigmaTree(
  node: FigmaNode,
  visit: (node: FigmaNode) => void,
): void {
  walkFigmaTreeWithAncestors(node, (n) => visit(n));
}

/** Depth-first walk with ancestor chain (root has no ancestors). */
export function walkFigmaTreeWithAncestors(
  node: FigmaNode,
  visit: (node: FigmaNode, ancestors: FigmaNode[]) => void,
  ancestors: FigmaNode[] = [],
): void {
  visit(node, ancestors);
  for (const child of node.children ?? []) {
    walkFigmaTreeWithAncestors(child, visit, [...ancestors, node]);
  }
}
