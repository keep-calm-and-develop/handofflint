import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText, stepCountIs } from "ai";

import { getTreeFromCache } from "@/lib/figma/cache";
import { makeInspectNodeTool } from "@/lib/agent/tools/inspect-node";
import { makeSearchGuidelinesTool } from "@/lib/agent/tools/search-guidelines";
import type { AgentErrorResponse, VisionLayoutProfile } from "@/lib/types";
import { VISION_LAYOUT_PROFILES, VISION_PROFILE_CONTEXT } from "@/lib/types";
import { FigmaNode } from "@/lib/figma/node";

const MAX_STEPS = 6;

function log(event: string, details?: Record<string, unknown>): void {
  console.log("[agent/vision]", event, details ?? "");
}

// ---------------------------------------------------------------------------
// System prompt builder — interpolates layout profile context
// ---------------------------------------------------------------------------

function buildSystemPrompt(layoutProfile: VisionLayoutProfile): string {
  const profileContext = VISION_PROFILE_CONTEXT[layoutProfile];

  return `You are a strict design review pre-processor for an AI code generator.
Your job is to identify visual mistakes in UI frames that deterministic linters cannot catch.

## Screen Context
${profileContext}

## Investigation Workflow
1. MACRO SCAN: Evaluate global screen composition. Count every CTA button visible — if more than one solid/filled high-contrast button appears in the same viewport section, that is a hierarchy_clash. Secondary actions MUST use outline, ghost, or text variants.
2. MICRO AUDIT: Use inspect_node_properties on specific nodes to verify padding, sizing, and layout constraints.
3. COPY SCAN: Read every piece of visible text in the screenshot character-by-character. Flag any misspelling, typo, or grammatical error as a typography_anomaly. Common patterns to catch: "entierly" → "entirely", "acces" → "access", "availibility" → "availability", missing articles, awkward phrasing.

## Available Tools
1. inspect_node_properties — Look up a Figma node's layout properties (padding, size, layoutMode) from the server cache.
2. search_layout_guidelines — Search a remote markdown design manual for best-practice guidelines by keyword. Only call this when you need to verify a specific guideline rule (e.g. "button hierarchy outline variant").

## Violation Categories (Prioritized)
- hierarchy_clash: Competing primary actions or conflicting visual weight (e.g., 4 solid black buttons in one screen where secondary outline buttons belong).
- typography_anomaly: Font size inconsistency, text wrapping orphans, line-height clipping, OR typos/misspellings in visible UI copy.
- visual_clipping: Content overflow, text overlapping borders, cut-off elements at container edges.
- palette_pollution: Wireframe gray leaks, random accent backgrounds, brand color misuse.
- symmetry_break: Matching peer elements with inconsistent corner-radius, alignment, padding, or sizing.

## Constraints
- Every violation MUST cite the most relevant nodeId from the provided node list.
- Typos and CTA hierarchy issues are HIGH priority — do not skip them.
- Recommendations MUST suggest concrete fixes (e.g., "change PINCODE and District secondary buttons to outline variant with border only").

## REQUIRED Final Output Format
After all investigations, your FINAL response MUST be ONLY the following JSON block — absolutely no prose before or after it:

\`\`\`json
{
  "enrichments": [
    {
      "nodeId": "N:N",
      "violationCategory": "hierarchy_clash",
      "perceptualFlawDescription": "One clear sentence describing the exact visual flaw.",
      "codegenPromptSuggestion": "One actionable fix instruction for the CSS/code generator."
    }
  ]
}
\`\`\`

Rules:
- violationCategory MUST be exactly one of: hierarchy_clash, typography_anomaly, visual_clipping, palette_pollution, symmetry_break
- nodeId MUST be a valid ID from the node list in the user message (format "N:N")
- If there are zero violations, output: \`\`\`json\n{"enrichments":[]}\n\`\`\`
- Do NOT include any explanation, summary, or markdown outside the JSON code block`;
}

/**
 * POST /api/agent/vision
 *
 * Wizard Step 3 — Streaming ReAct Vision Investigation. Boots an autonomous
 * multi-turn loop where Gemini inspects the rendered frame screenshot, invokes
 * tools to verify node properties and search guidelines, and streams every step
 * back to the client in real-time via chunked transfer encoding.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { fileKey, nodeId, imageUrl, layoutProfile, designManualUrl } =
    body as {
      fileKey?: string;
      nodeId?: string;
      imageUrl?: string;
      layoutProfile?: string;
      designManualUrl?: string;
    };

  if (!fileKey?.trim()) {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Missing fileKey" },
      { status: 400 },
    );
  }

  if (!nodeId?.trim()) {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Missing nodeId" },
      { status: 400 },
    );
  }

  if (!imageUrl?.trim()) {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Missing imageUrl" },
      { status: 400 },
    );
  }

  // Validate cache exists
  const treeMap = getTreeFromCache(fileKey);
  if (!treeMap) {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Cache miss — run /api/agent/init first" },
      { status: 400 },
    );
  }

  const nodeListIndex = Array.from((treeMap as Map<string, FigmaNode>).values())
    .map((node) => `- ${node.name} (ID: "${node.id}", Type: ${node.type})`)
    .slice(0, 15) // Keep it short so it doesn't break your token budget
    .join("\n");

  // Resolve layout profile with fallback
  const resolvedProfile: VisionLayoutProfile =
    layoutProfile &&
    VISION_LAYOUT_PROFILES.includes(layoutProfile as VisionLayoutProfile)
      ? (layoutProfile as VisionLayoutProfile)
      : "dashboard";

  log("stream_start", {
    fileKey,
    nodeId,
    imageUrl,
    layoutProfile: resolvedProfile,
    designManualUrl: designManualUrl ?? null,
    maxSteps: MAX_STEPS,
  });

  // Build user message with screenshot and optional design manual hint
  const manualNote = designManualUrl?.trim()
    ? `\n\nUse this design manual URL when calling search_layout_guidelines: ${designManualUrl.trim()}`
    : "";

  const userPrompt =
    `Analyze this UI frame screenshot. The target node is "${nodeId}" within file "${fileKey}". ` +
    `This is a ${resolvedProfile} layout.\n\n` +
    `### CRITICAL: Available Valid Sub-Node IDs on this screen:\n${nodeListIndex}\n\n` +
    `Investigate every perceptual design flaw visible: CTA button hierarchy, typography inconsistencies, ` +
    `and read every text string carefully for typos or misspellings. ` +
    `When you find a bug, match it to one of the valid Node IDs listed above and run inspect_node_properties on it. ` +
    `Do not guess IDs outside of this list.\n\n` +
    `IMPORTANT: Your FINAL response must be ONLY a JSON code block starting with \`\`\`json — no prose before or after.` +
    manualNote;

  const result = streamText({
    model: google("gemini-2.5-flash"),
    stopWhen: stepCountIs(MAX_STEPS),
    tools: {
      inspect_node_properties: makeInspectNodeTool(fileKey),
      search_layout_guidelines: makeSearchGuidelinesTool(),
    },
    system: buildSystemPrompt(resolvedProfile),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image", image: new URL(imageUrl) },
        ],
      },
    ],
    onStepFinish({ toolCalls }) {
      log("step_finish", {
        toolCalls: toolCalls?.map((tc) => tc.toolName) ?? [],
      });
    },
    onFinish({ steps, usage }) {
      const allToolCalls = steps.flatMap((s) =>
        s.toolCalls.map((tc) => tc.toolName),
      );
      log("stream_complete", {
        totalSteps: steps.length,
        toolCalls: allToolCalls,
        totalTokens: usage.totalTokens,
      });
    },
    onError({ error }) {
      log("stream_error", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
