import { tool } from "ai";
import { z } from "zod";

import { fetchFigmaImages } from "@/lib/figma/images";
import { FigmaApiError } from "@/lib/figma/fetch";

// ---------------------------------------------------------------------------
// Output schema
// ---------------------------------------------------------------------------

export const RenderFrameOutputSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    nodeId: z.string(),
    url: z.string().url(),
    scale: z.number(),
    format: z.enum(["png", "jpg", "svg", "pdf"]),
    source: z.enum(["api", "cache"]),
  }),
  z.object({
    /**
     * The node exists in the tree but produces no visible pixels —
     * invisible, 0% opacity, or off-canvas. No visual critique is possible.
     */
    status: z.literal("null_render"),
    nodeId: z.string(),
    reason: z.string(),
  }),
  z.object({
    /**
     * The render call failed (permission, network, rate-limit).
     * The agent should degrade gracefully and rely on deterministic findings.
     */
    status: z.literal("error"),
    nodeId: z.string(),
    message: z.string(),
    code: z.number().optional(),
  }),
]);

export type RenderFrameOutput = z.infer<typeof RenderFrameOutputSchema>;

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

/**
 * `render_frame` — Renders a Figma node to a PNG (or other format) via the
 * Figma Images API (`GET /v1/images/:fileKey`) and returns a pre-signed URL
 * ready for multimodal vision critique.
 *
 * Returns a discriminated union so the agent can branch cleanly:
 *   - `"ok"`          → pass `url` to `vision_critique`
 *   - `"null_render"` → node is invisible; skip vision, log and move on
 *   - `"error"`       → render failed; degrade to deterministic findings only
 */
const renderFrameInputSchema = z.object({
  nodeId: z
    .string()
    .describe(
      "The Figma node ID to render (e.g. '1:4'). Must exist in the current file tree.",
    ),
  scale: z
    .number()
    .min(0.01)
    .max(4)
    .default(2)
    .describe(
      "Pixel density multiplier. 2 = @2x (default). Use 1 for large frames to stay within the 32MP cap.",
    ),
  format: z
    .enum(["png", "jpg", "svg", "pdf"])
    .default("png")
    .describe("Image encoding. Use png for crisp UI; jpg for photos."),
});

type RenderFrameInput = z.infer<typeof renderFrameInputSchema>;

export function makeRenderFrameTool(fileKey: string) {
  return tool({
    description:
      "Render a Figma node to a PNG image and return its URL for visual inspection. " +
      "Use this when a deterministic audit flags a node that may have perceptual issues " +
      "(broken hierarchy, overlap, crowding, misalignment). " +
      "Returns null_render when the node produces no visible pixels — skip vision critique in that case.",
    inputSchema: renderFrameInputSchema,
    execute: async (
      input: RenderFrameInput,
    ): Promise<RenderFrameOutput> => {
      const { nodeId, scale, format } = input;

      let result;
      try {
        result = await fetchFigmaImages(fileKey, [nodeId], { scale, format });
      } catch (err) {
        if (err instanceof FigmaApiError) {
          return {
            status: "error",
            nodeId,
            message: err.message,
            code: err.status,
          };
        }
        return {
          status: "error",
          nodeId,
          message: err instanceof Error ? err.message : "Unknown error",
        };
      }

      if (!result) {
        return {
          status: "error",
          nodeId,
          message:
            "FIGMA_ACCESS_TOKEN is not configured — cannot render frame.",
        };
      }

      const url = result.images[nodeId];

      if (url === null || url === undefined) {
        return {
          status: "null_render",
          nodeId,
          reason:
            "Figma returned null for this node — it is likely invisible, has 0% opacity, " +
            "or lies outside the canvas. No visual critique is possible.",
        };
      }

      return {
        status: "ok",
        nodeId,
        url,
        scale,
        format,
        source: result.source,
      };
    },
  });
}
