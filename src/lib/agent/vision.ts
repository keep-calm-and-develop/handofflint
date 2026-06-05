import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { VisionCritiqueSchema } from "./schemas/vision"; // The schema we refined in 3.2

interface AnalyzeFrameParams {
  imageUrl: string;
  figmaNodeContext: string;
}

/**
 * Executes an upgraded single-turn structured vision check against a rendered frame.
 * Uses the free development tier allowance from Google AI Studio.
 */
export async function analyzeVisualFrame({
  imageUrl,
  figmaNodeContext,
}: AnalyzeFrameParams) {
  try {
    // Modern AI SDK v6 structured syntax: generateText + Output.object
    const result = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({ schema: VisionCritiqueSchema }),
      messages: [
        {
          role: "system",
          content: `You are a strict design review pre-processor for an AI code generator.
                   Your job is to identify visual mistakes that standard code strings cannot analyze.
                   
                   Focus ONLY on true aesthetic anomalies:
                   - hierarchy_clash (e.g., competing primary action buttons placed next to each other).
                   - typography_anomaly (e.g., lines wrapping weirdly leaving lone characters, or line-height clipping).
                   - visual_clipping (e.g., dynamic text overlapping icons or borders).
                   - palette_pollution (e.g., wireframe gray styling leaks, randomized accent backgrounds).
                   - symmetry_break (e.g., matching parent elements using contrasting corner-radiuses).
                   
                   Do NOT complain about color contrast numbers or pixel spacing grids.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this UI layout asset frame. Cross-examine what you see against this layout string property snapshot: ${figmaNodeContext}`,
            },
            {
              type: "image",
              image: new URL(imageUrl),
            },
          ],
        },
      ],
    });

    // Clean, structured data is returned under the `.output` object payload
    return { status: "success", enrichments: result.output.enrichments };
  } catch (error) {
    console.error("Gemini Vision Pre-flight Pipeline Broken:", error);
    return {
      status: "error",
      enrichments: [],
      message:
        error instanceof Error
          ? error.message
          : "Unknown model interaction failure",
    };
  }
}
