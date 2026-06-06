import { describe, expect, it } from "vitest";

import {
  consumeVisionStreamChunks,
  countAgentTurnsWithTools,
  finalizeVisionStream,
  INITIAL_VISION_ACTIVITY,
  parseVisionCritiqueOutput,
} from "./vision-stream";

describe("vision-stream", () => {
  it("parses violations JSON from streamed markdown output", () => {
    const text = `\`\`\`json
{
  "violations": [
    {
      "nodeId": "2:33",
      "category": "hierarchy_clash",
      "description": "Too many primary buttons compete for attention.",
      "recommendation": "Use ghost buttons for secondary actions."
    }
  ]
}
\`\`\``;

    expect(parseVisionCritiqueOutput(text)).toEqual([
      {
        nodeId: "2:33",
        violationCategory: "hierarchy_clash",
        perceptualFlawDescription:
          "Too many primary buttons compete for attention.",
        codegenPromptSuggestion: "Use ghost buttons for secondary actions.",
      },
    ]);
  });

  it("builds structured tool call activity from stream chunks", () => {
    const initial = {
      activity: INITIAL_VISION_ACTIVITY,
      textBuffer: "",
    };

    const afterChunks = consumeVisionStreamChunks(
      [
        { type: "start" },
        { type: "start-step" },
        {
          type: "tool-input-start",
          toolCallId: "call-1",
          toolName: "inspect_node_properties",
        },
        {
          type: "tool-input-available",
          toolCallId: "call-1",
          toolName: "inspect_node_properties",
          input: { nodeId: "1:4" },
        },
        {
          type: "tool-output-available",
          toolCallId: "call-1",
          output: {
            status: "ok",
            nodeId: "1:4",
            properties: {
              name: "Frame",
              absoluteBoundingBox: { width: 411 },
            },
          },
        },
        { type: "finish-step" },
      ],
      initial,
    );

    expect(afterChunks.activity.phase).toBe("investigating");
    expect(afterChunks.activity.toolCalls).toHaveLength(1);
    expect(afterChunks.activity.toolCalls[0]).toMatchObject({
      turn: 1,
      toolName: "inspect_node_properties",
      status: "ok",
      nodeId: "1:4",
      inputSummary: "Node 1:4",
    });

    const finalized = finalizeVisionStream({
      ...afterChunks,
      textBuffer: `\`\`\`json\n{"violations":[{"nodeId":"2:33","category":"hierarchy_clash","description":"Clash","recommendation":"Fix"}]}\n\`\`\``,
    });

    expect(finalized.activity.phase).toBe("complete");
    expect(finalized.activity.enrichments).toHaveLength(1);
  });

  it("does not create phantom turns when the agent finishes with a text-only step", () => {
    const initial = {
      activity: INITIAL_VISION_ACTIVITY,
      textBuffer: "",
    };

    const afterChunks = consumeVisionStreamChunks(
      [
        { type: "start" },
        { type: "start-step" },
        {
          type: "tool-input-start",
          toolCallId: "call-1",
          toolName: "inspect_node_properties",
        },
        {
          type: "tool-output-available",
          toolCallId: "call-1",
          output: { status: "ok", nodeId: "2:33" },
        },
        { type: "finish-step" },
        { type: "start-step" },
        { type: "text-start", id: "0" },
        { type: "text-delta", id: "0", delta: '{"violations":[]}' },
        { type: "finish-step" },
        { type: "finish", finishReason: "stop" },
      ],
      initial,
    );

    expect(afterChunks.activity.toolCalls).toHaveLength(1);
    expect(countAgentTurnsWithTools(afterChunks.activity.toolCalls)).toBe(1);
    expect(afterChunks.activity.agentTurn).toBe(2);
    expect(afterChunks.activity.phase).toBe("complete");
  });
});
