import figmaExample from "@example.json";

import type { FigmaNode } from "@/lib/figma/node";
import { countFigmaNodes, extractFigmaDocuments, walkFigmaTree } from "@/lib/figma/tree";

export const EXAMPLE_JSON_FILE = "example.json";
export const AGENT_SSE_CAPTURE_FILE = "agent-output-2.txt";

export interface ExampleFigmaFixtureMeta {
  sourceFile: string;
  fileName: string;
  frameName: string;
  nodesIndexed: number;
  version: string;
}

let nodeIndex: Map<string, FigmaNode> | null = null;

function getExampleNodeIndex(): Map<string, FigmaNode> {
  if (nodeIndex) {
    return nodeIndex;
  }

  nodeIndex = new Map<string, FigmaNode>();
  for (const doc of extractFigmaDocuments(figmaExample)) {
    walkFigmaTree(doc, (node) => {
      nodeIndex!.set(node.id, node);
    });
  }

  return nodeIndex;
}

export function getExampleFigmaFixtureMeta(): ExampleFigmaFixtureMeta {
  const record = figmaExample as {
    name?: string;
    version?: string;
  };
  const docs = extractFigmaDocuments(figmaExample);

  return {
    sourceFile: EXAMPLE_JSON_FILE,
    fileName: record.name ?? "vaxin",
    frameName: docs[0]?.name ?? "Frame",
    nodesIndexed: getExampleNodeIndex().size,
    version: record.version ?? "unknown",
  };
}

export function getExampleNode(nodeId: string): FigmaNode | null {
  return getExampleNodeIndex().get(nodeId) ?? null;
}

export function getExampleNodeIndexMap(): Map<string, FigmaNode> {
  return new Map(getExampleNodeIndex());
}

export function getExampleNodeIdSet(): Set<string> {
  return new Set(getExampleNodeIndex().keys());
}

export function getExampleNodeAsRecord(
  nodeId: string,
): Record<string, unknown> | null {
  const node = getExampleNode(nodeId);
  return node ? (node as unknown as Record<string, unknown>) : null;
}

export function countExampleFigmaNodes(): number {
  return countFigmaNodes(extractFigmaDocuments(figmaExample));
}

/** Reset in-memory index (tests only). */
export function resetExampleNodeIndex(): void {
  nodeIndex = null;
}
