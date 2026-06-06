import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText, stepCountIs } from "ai";

import { getTreeFromCache } from "@/lib/figma/cache";
import { makeInspectNodeTool } from "@/lib/agent/tools/inspect-node";
import { makeSearchGuidelinesTool } from "@/lib/agent/tools/search-guidelines";
import type { AgentErrorResponse, VisionLayoutProfile } from "@/lib/types";
import { VISION_LAYOUT_PROFILES, VISION_PROFILE_CONTEXT } from "@/lib/types";
import { FigmaNode } from "@/lib/figma/node";

const MAX_STEPS = 5;

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

## Available Tools
1. inspect_node_properties — Look up a Figma node's layout properties (padding, size, layoutMode) from the server cache. Use this to verify exact property values when you spot something suspicious.
2. search_layout_guidelines — Search a remote markdown design manual for best-practice guidelines by keyword. Use this to ground your recommendations in documented standards.

## Investigation Flow
1. Visually inspect the screenshot with the screen context in mind.
2. Identify suspicious elements — focus on the priorities listed above for this layout type.
3. Use inspect_node_properties to verify actual property values for suspect nodes.
4. Use search_layout_guidelines to find relevant best-practice documentation.
5. Synthesize your findings into the structured output schema.

## Violation Categories
- hierarchy_clash: Competing primary actions or conflicting visual weight within the same viewport section.
- typography_anomaly: Text wrapping leaving orphans, line-height clipping, inconsistent font sizes across peer elements.
- visual_clipping: Content overflow, text overlapping icons or borders, cut-off elements at container edges.
- palette_pollution: Wireframe gray leaks, random accent backgrounds, brand color misuse exceeding the 10% accent rule.
- symmetry_break: Matching peer elements with inconsistent corner-radius, alignment, padding, or sizing.

## Constraints
- Do NOT flag raw spacing pixel values or color contrast numbers — those are handled by deterministic audits.
- Every violation MUST cite a specific nodeId you verified via inspect_node_properties.
- Recommendations MUST reference guidelines from search_layout_guidelines when available.`;
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
    `Investigate any perceptual design flaws you can see. ` +
    `When you find a bug, match it to one of the valid Node IDs listed above and run inspect_node_properties on it. ` +
    `Do not guess IDs outside of this list.` +
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
