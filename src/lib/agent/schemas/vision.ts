import { z } from "zod";

/**
 * Zod schema defining the strict structured output we expect from Gemini Vision.
 * This guarantees the model outputs a clean, typed array we can map directly to our UI.
 */
export const VisionCritiqueSchema = z.object({
  enrichments: z.array(
    z.object({
      nodeId: z
        .string()
        .describe(
          "The unique Figma node ID of the element that has the visual flaw.",
        ),

      violationCategory: z
        .enum([
          "hierarchy_clash",
          "typography_anomaly",
          "visual_clipping",
          "palette_pollution",
          "symmetry_break",
        ])
        .describe(
          "The category of the perceptual design defect noticed. Do NOT report spacing grid or contrast math errors here.",
        ),

      perceptualFlawDescription: z
        .string()
        .describe(
          "A crisp, developer-focused description of the aesthetic break (e.g., 'Two filled buttons are placed adjacent to each other, breaking primary vs secondary user flow').",
        ),

      codegenPromptSuggestion: z
        .string()
        .describe(
          "An actionable prompt instruction to inject into Cursor/v0 to enforce clean, maintainable tailwind layout styling rules (e.g., 'Change button class from bg-black to border border-zinc-300 bg-transparent to preserve secondary button variant intent').",
        ),
    }),
  ),
});

// Create a TypeScript type definition derived directly from the Zod schema
export type VisionCritiqueOutput = z.infer<typeof VisionCritiqueSchema>;
