import fs from "fs";
import path from "path";

import {
  consumeVisionStreamChunks,
  finalizeVisionStream,
  groupToolCallsByTurn,
  INITIAL_VISION_ACTIVITY,
  parseSseBuffer,
  type VisionStreamParseResult,
  type VisionToolCallActivity,
} from "@/lib/agent/vision-stream";
import {
  AGENT_SSE_CAPTURE_FILE,
  getExampleFigmaFixtureMeta,
} from "@/lib/presentation-mock-data";
import type { AIEnrichmentItem } from "@/lib/types";

export const MAX_AGENT_STEPS = 6;

export interface TurnExplanation {
  turn: number;
  kind: "observe" | "tool" | "synthesize";
  title: string;
  agentThought: string;
  toolCall?: VisionToolCallActivity;
  detail?: string;
}

export interface ReactLoopPresentationData {
  fixture: ReturnType<typeof getExampleFigmaFixtureMeta>;
  streamSourceFile: string;
  maxSteps: number;
  stepsUsed: number;
  toolCallCount: number;
  turns: TurnExplanation[];
  enrichments: AIEnrichmentItem[];
  streamPhases: Array<{ phase: string; label: string }>;
}

const TURN_NARRATION: Record<number, { title: string; agentThought: string; detail?: string }> = {
  1: {
    title: "Inspect text layer",
    agentThought:
      "Screenshot shows body copy with a possible typo (“availibility”). Look up node 2:3 in the flat index to read exact characters and dimensions.",
    detail:
      "Returns shallow props only — children stripped. Node 2:3 comes from example.json (vaxin pincode UI).",
  },
  2: {
    title: "Search design guidelines",
    agentThought:
      "Text may have an orphan word on the last line. Search the remote markdown manual for wrapping and typography rules.",
    detail: "RAG returns 6 matching paragraphs (typography system sections).",
  },
  3: {
    title: "Inspect pincode component",
    agentThought:
      "Pincode input boxes look horizontally cramped. Verify the parent component’s bounding box from cache.",
    detail: "Node 2:28 from example.json — real child subtrees stay in Redis, not sent to the model.",
  },
  4: {
    title: "Search spacing rules",
    agentThought:
      "Spacing between inputs feels dense. Pull 8pt grid and spacing guidelines to ground the recommendation.",
    detail: "RAG returns 8 matches including the 8pt Grid System section.",
  },
  5: {
    title: "Synthesize JSON findings",
    agentThought:
      "Enough evidence from vision + tool results. Emit structured enrichments — one per violation, each tied to a real nodeId.",
    detail:
      "Final step streams a ```json block. Parser maps violations → enrichments for the UI.",
  },
};

function loadMockSseCapture(): string {
  const filePath = path.join(process.cwd(), AGENT_SSE_CAPTURE_FILE);
  return fs.readFileSync(filePath, "utf8");
}

function buildTurnExplanations(
  grouped: Array<{ turn: number; toolCalls: VisionToolCallActivity[] }>,
  synthesisTurn: number,
  fixture: ReturnType<typeof getExampleFigmaFixtureMeta>,
): TurnExplanation[] {
  const explanations: TurnExplanation[] = [
    {
      turn: 0,
      kind: "observe",
      title: "Macro scan (screenshot)",
      agentThought:
        `Gemini receives the rendered frame PNG from ${fixture.sourceFile} (${fixture.frameName}) plus a allowlist of valid node IDs. It scans for hierarchy clashes, typos, clipping, and spacing issues before calling tools.`,
    },
  ];

  for (const { turn, toolCalls } of grouped) {
    const narration = TURN_NARRATION[turn];
    for (const call of toolCalls) {
      explanations.push({
        turn,
        kind: "tool",
        title: narration?.title ?? call.label,
        agentThought: narration?.agentThought ?? "Agent invoked a tool to verify a visual suspicion.",
        toolCall: call,
        detail: narration?.detail,
      });
    }
  }

  const synth = TURN_NARRATION[synthesisTurn];
  explanations.push({
    turn: synthesisTurn,
    kind: "synthesize",
    title: synth.title,
    agentThought: synth.agentThought,
    detail: synth.detail,
  });

  return explanations;
}

export function buildReactLoopPresentationData(): ReactLoopPresentationData {
  const fixture = getExampleFigmaFixtureMeta();
  const raw = loadMockSseCapture();
  const { events } = parseSseBuffer(`${raw}\n`);

  let state: VisionStreamParseResult = {
    activity: { ...INITIAL_VISION_ACTIVITY, phase: "connecting" },
    textBuffer: "",
  };

  state = consumeVisionStreamChunks(events, state);
  state = finalizeVisionStream(state);

  const grouped = groupToolCallsByTurn(state.activity.toolCalls);
  const toolTurns = grouped.length;
  const synthesisTurn = toolTurns + 1;
  const stepsUsed = synthesisTurn;

  return {
    fixture,
    streamSourceFile: AGENT_SSE_CAPTURE_FILE,
    maxSteps: MAX_AGENT_STEPS,
    stepsUsed,
    toolCallCount: state.activity.toolCalls.length,
    turns: buildTurnExplanations(grouped, synthesisTurn, fixture),
    enrichments: state.activity.enrichments ?? [],
    streamPhases: [
      { phase: "connecting", label: "Stream opens" },
      { phase: "investigating", label: "Tool turns (ReAct loop)" },
      { phase: "synthesizing", label: "JSON critique written" },
      { phase: "complete", label: "Findings parsed" },
    ],
  };
}
