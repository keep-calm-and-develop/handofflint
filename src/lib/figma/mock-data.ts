import figmaExample from "@example.json";

/** Fixture helpers for MSW handlers — not used by the Figma client directly. */

/** GET /files/:key?depth=2 — file tree (shallow document). */
export function toMockFileTreeResponse(): Record<string, unknown> {
  const { nodes, ...meta } = figmaExample as Record<string, unknown>;
  if (!nodes || typeof nodes !== "object") {
    return figmaExample as Record<string, unknown>;
  }

  const first = Object.values(nodes as Record<string, unknown>)[0];
  const document =
    first && typeof first === "object" && "document" in first
      ? (first as { document: unknown }).document
      : undefined;

  return document ? { ...meta, document } : meta;
}

/** Mock payload for file or node subtree fetches (matches MSW handlers). */
export function getMockFigmaTreeData(nodeId: string | null): unknown {
  return nodeId ? figmaExample : toMockFileTreeResponse();
}
