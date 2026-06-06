import { tool } from "ai";
import { z } from "zod";

import { getIndexedNode } from "@/lib/figma/cache";
import type { FigmaNode } from "@/lib/figma/node";

// ---------------------------------------------------------------------------
// Input schema — forces the model to supply a specific node ID string
// ---------------------------------------------------------------------------

const inspectNodeInputSchema = z.object({
  nodeId: z
    .string()
    .describe(
      "The Figma node ID to inspect (e.g. '4:23'). Must exist in the indexed tree cache.",
    ),
});

export type InspectNodeInput = z.infer<typeof inspectNodeInputSchema>;

// ---------------------------------------------------------------------------
// Output schema
// ---------------------------------------------------------------------------

export const InspectNodeOutputSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    nodeId: z.string(),
    properties: z.record(z.string(), z.unknown()),
  }),
  z.object({
    status: z.literal("not_found"),
    nodeId: z.string(),
    message: z.string(),
  }),
]);

export type InspectNodeOutput = z.infer<typeof InspectNodeOutputSchema>;

// ---------------------------------------------------------------------------
// Execution logic
// ---------------------------------------------------------------------------

/**
 * Strips the nested `children` array from a FigmaNode and returns only
 * the shallow layout properties to protect the agent's token budget.
 */
function extractShallowProperties(node: FigmaNode): Record<string, unknown> {
  const { children: _children, ...shallowProps } = node; // eslint-disable-line @typescript-eslint/no-unused-vars
  return shallowProps;
}

export function executeInspectNode(
  fileKey: string,
  input: InspectNodeInput,
): InspectNodeOutput {
  const { nodeId } = input;

  const node = getIndexedNode(fileKey, nodeId);

  if (!node) {
    return {
      status: "not_found",
      nodeId,
      message: `Node "${nodeId}" not found in the indexed tree for file "${fileKey}".`,
    };
  }

  return {
    status: "ok",
    nodeId,
    properties: extractShallowProperties(node),
  };
}

// ---------------------------------------------------------------------------
// Tool factory — captures fileKey via closure so the model only supplies nodeId
// ---------------------------------------------------------------------------

export function makeInspectNodeTool(fileKey: string) {
  return tool({
    description:
      "Look up a Figma node by ID in the server-side cache and return its shallow layout properties " +
      "(padding, width, height, layoutMode, fills, constraints). Child arrays are stripped to save tokens. " +
      "Use this to verify exact property values when a visual anomaly is suspected.",
    inputSchema: inspectNodeInputSchema,
    outputSchema: InspectNodeOutputSchema,
    execute: async (input) => executeInspectNode(fileKey, input),
  });
}
