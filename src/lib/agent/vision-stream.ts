import type { UIMessageChunk } from "ai";

import type { AIEnrichmentItem } from "@/lib/types";

const NODE_ID_PATTERN = /\b\d+:\d+\b/g;

const VIOLATION_CATEGORIES = new Set<AIEnrichmentItem["violationCategory"]>([
  "hierarchy_clash",
  "typography_anomaly",
  "visual_clipping",
  "palette_pollution",
  "symmetry_break",
]);

const TOOL_LABELS: Record<string, string> = {
  inspect_node_properties: "Inspect node properties",
  search_layout_guidelines: "Search layout guidelines",
  render_frame: "Render frame",
};

export type VisionActivityPhase =
  | "idle"
  | "connecting"
  | "investigating"
  | "synthesizing"
  | "complete"
  | "error";

export type VisionToolCallStatus = "running" | "ok" | "not_found" | "error";

export interface VisionToolCallActivity {
  id: string;
  /** Agent turn from the stream (increments on each start-step). */
  turn: number;
  toolName: string;
  label: string;
  inputSummary: string | null;
  outputSummary: string | null;
  status: VisionToolCallStatus;
  nodeId: string | null;
}

export interface VisionActivityState {
  phase: VisionActivityPhase;
  toolCalls: VisionToolCallActivity[];
  /** Latest agent turn counter from the stream. */
  agentTurn: number;
  enrichments: AIEnrichmentItem[] | null;
  nodeIds: string[];
  error: string | null;
  /** Raw synthesis text from the model's final step — shown as fallback when JSON parsing yields no findings. */
  rawAnalysis: string | null;
}

export interface VisionStreamParseResult {
  activity: VisionActivityState;
  textBuffer: string;
}

export const INITIAL_VISION_ACTIVITY: VisionActivityState = {
  phase: "idle",
  toolCalls: [],
  agentTurn: 0,
  enrichments: null,
  nodeIds: [],
  error: null,
  rawAnalysis: null,
};

function extractNodeId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const candidates = [record.nodeId, record.node_id];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && NODE_ID_PATTERN.test(candidate)) {
      return candidate.match(NODE_ID_PATTERN)?.[0] ?? candidate;
    }
  }

  const serialized = JSON.stringify(value);
  const match = serialized.match(NODE_ID_PATTERN);
  return match?.[0] ?? null;
}

function normalizeCategory(
  value: unknown,
): AIEnrichmentItem["violationCategory"] | null {
  if (typeof value !== "string") return null;
  return VIOLATION_CATEGORIES.has(value as AIEnrichmentItem["violationCategory"])
    ? (value as AIEnrichmentItem["violationCategory"])
    : null;
}

function normalizeEnrichmentItem(raw: Record<string, unknown>): AIEnrichmentItem | null {
  const nodeId = typeof raw.nodeId === "string" ? raw.nodeId : null;
  const category = normalizeCategory(
    raw.violationCategory ?? raw.category,
  );
  const description =
    typeof raw.perceptualFlawDescription === "string"
      ? raw.perceptualFlawDescription
      : typeof raw.description === "string"
        ? raw.description
        : null;
  const suggestion =
    typeof raw.codegenPromptSuggestion === "string"
      ? raw.codegenPromptSuggestion
      : typeof raw.recommendation === "string"
        ? raw.recommendation
        : null;

  if (!nodeId || !category || !description || !suggestion) {
    return null;
  }

  return {
    nodeId,
    violationCategory: category,
    perceptualFlawDescription: description,
    codegenPromptSuggestion: suggestion,
  };
}

export function parseVisionCritiqueOutput(text: string): AIEnrichmentItem[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Prefer JSON extracted from a code fence (```json ... ``` or ``` ... ```)
  // This handles both clean JSON-only responses and JSON embedded in prose.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonSource = fenceMatch ? fenceMatch[1] : trimmed;

  const jsonMatch = jsonSource.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const source = Array.isArray(parsed.enrichments)
      ? parsed.enrichments
      : Array.isArray(parsed.violations)
        ? parsed.violations
        : [];

    return source
      .map((item) =>
        normalizeEnrichmentItem(
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {},
        ),
      )
      .filter((item): item is AIEnrichmentItem => item !== null);
  } catch {
    return [];
  }
}

function summarizeToolInput(
  toolName: string,
  input: Record<string, unknown> | undefined,
): string | null {
  if (!input) return null;

  if (toolName === "search_layout_guidelines") {
    const query = typeof input.query === "string" ? input.query : null;
    return query ? `Query: “${query}”` : null;
  }

  const nodeId = extractNodeId(input);
  return nodeId ? `Node ${nodeId}` : null;
}

function summarizeToolOutput(output: unknown): {
  summary: string;
  status: VisionToolCallStatus;
  nodeId: string | null;
} {
  if (!output || typeof output !== "object") {
    return { summary: "Completed", status: "ok", nodeId: null };
  }

  const record = output as Record<string, unknown>;
  const statusValue = typeof record.status === "string" ? record.status : "ok";
  const nodeId = extractNodeId(output);

  if (statusValue === "not_found") {
    return {
      summary: nodeId ? `Node ${nodeId} not found in cache` : "Node not found",
      status: "not_found",
      nodeId,
    };
  }

  if (statusValue === "error") {
    const message =
      typeof record.message === "string" ? record.message : "Tool failed";
    return { summary: message, status: "error", nodeId };
  }

  if ("matchCount" in record) {
    const matchCount =
      typeof record.matchCount === "number" ? record.matchCount : 0;
    return {
      summary: `Matched ${matchCount} guideline${matchCount === 1 ? "" : "s"}`,
      status: "ok",
      nodeId,
    };
  }

  if ("properties" in record && record.properties) {
    const props = record.properties as Record<string, unknown>;
    const name = typeof props.name === "string" ? props.name : "Node";
    const width = (props.absoluteBoundingBox as { width?: number } | undefined)
      ?.width;
    return {
      summary: width ? `${name} · ${width}px wide` : name,
      status: "ok",
      nodeId,
    };
  }

  return {
    summary: nodeId ? `Node ${nodeId} verified` : "Completed",
    status: "ok",
    nodeId,
  };
}

function findToolCall(
  toolCalls: VisionToolCallActivity[],
  toolCallId: string,
): VisionToolCallActivity | null {
  return toolCalls.find((call) => call.id === toolCallId) ?? null;
}

function currentTurn(agentTurn: number): number {
  return agentTurn > 0 ? agentTurn : 1;
}

function collectNodeIds(
  toolCalls: VisionToolCallActivity[],
  textBuffer: string,
): string[] {
  const nodeIds = new Set<string>();

  for (const call of toolCalls) {
    if (call.nodeId) nodeIds.add(call.nodeId);
  }

  for (const id of textBuffer.match(NODE_ID_PATTERN) ?? []) {
    nodeIds.add(id);
  }

  return Array.from(nodeIds);
}

export function groupToolCallsByTurn(
  toolCalls: VisionToolCallActivity[],
): Array<{ turn: number; toolCalls: VisionToolCallActivity[] }> {
  const grouped = new Map<number, VisionToolCallActivity[]>();

  for (const call of toolCalls) {
    const existing = grouped.get(call.turn) ?? [];
    existing.push(call);
    grouped.set(call.turn, existing);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left - right)
    .map(([turn, calls]) => ({ turn, toolCalls: calls }));
}

export function countAgentTurnsWithTools(
  toolCalls: VisionToolCallActivity[],
): number {
  return new Set(toolCalls.map((call) => call.turn)).size;
}

export function parseSseBuffer(buffer: string): {
  events: UIMessageChunk[];
  remainder: string;
} {
  const events: UIMessageChunk[] = [];
  const lines = buffer.split(/\r?\n/);
  const remainder = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;

    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;

    try {
      events.push(JSON.parse(payload) as UIMessageChunk);
    } catch {
      // Ignore malformed partial frames; remainder handling will retry.
    }
  }

  return { events, remainder };
}

export function consumeVisionStreamChunks(
  chunks: UIMessageChunk[],
  state: VisionStreamParseResult,
): VisionStreamParseResult {
  const activity: VisionActivityState = {
    ...state.activity,
    toolCalls: state.activity.toolCalls.map((call) => ({ ...call })),
  };
  let textBuffer = state.textBuffer;

  for (const chunk of chunks) {
    switch (chunk.type) {
      case "start":
        activity.phase = "connecting";
        break;

      case "start-step":
        activity.agentTurn += 1;
        if (activity.phase !== "synthesizing") {
          activity.phase = "investigating";
        }
        break;

      case "tool-input-start":
        activity.toolCalls.push({
          id: chunk.toolCallId,
          turn: currentTurn(activity.agentTurn),
          toolName: chunk.toolName,
          label: TOOL_LABELS[chunk.toolName] ?? chunk.toolName,
          inputSummary: null,
          outputSummary: null,
          status: "running",
          nodeId: null,
        });
        if (activity.phase === "connecting") {
          activity.phase = "investigating";
        }
        break;

      case "tool-input-available": {
        const call = findToolCall(activity.toolCalls, chunk.toolCallId);
        if (call) {
          const input = chunk.input as Record<string, unknown> | undefined;
          call.inputSummary = summarizeToolInput(chunk.toolName, input);
          call.nodeId = input ? extractNodeId(input) : call.nodeId;
        }
        break;
      }

      case "tool-output-available": {
        const call = findToolCall(activity.toolCalls, chunk.toolCallId);
        const parsed = summarizeToolOutput(chunk.output);
        if (call) {
          call.outputSummary = parsed.summary;
          call.status = parsed.status;
          call.nodeId = parsed.nodeId ?? call.nodeId;
        }
        break;
      }

      case "text-start":
        activity.phase = "synthesizing";
        break;

      case "text-delta":
        textBuffer += chunk.delta;
        activity.phase = "synthesizing";
        break;

      case "error":
        activity.phase = "error";
        activity.error = chunk.errorText;
        break;

      case "finish":
        activity.phase = "complete";
        activity.enrichments = parseVisionCritiqueOutput(textBuffer);
        activity.rawAnalysis = textBuffer.trim() || null;
        break;

      default:
        break;
    }
  }

  activity.nodeIds = collectNodeIds(activity.toolCalls, textBuffer);

  return {
    activity,
    textBuffer,
  };
}

export function finalizeVisionStream(
  state: VisionStreamParseResult,
): VisionStreamParseResult {
  const enrichments =
    state.activity.enrichments ?? parseVisionCritiqueOutput(state.textBuffer);

  return {
    ...state,
    activity: {
      ...state.activity,
      phase: state.activity.phase === "error" ? "error" : "complete",
      enrichments,
      rawAnalysis: state.activity.rawAnalysis ?? (state.textBuffer.trim() || null),
      nodeIds: collectNodeIds(state.activity.toolCalls, state.textBuffer),
    },
  };
}

export function summarizeVisionText(text: string): string {
  const enrichments = parseVisionCritiqueOutput(text);
  if (enrichments.length === 0) {
    return "Vision investigation complete.";
  }

  return enrichments
    .slice(0, 3)
    .map(
      (item) =>
        `[${item.nodeId}] ${item.perceptualFlawDescription.slice(0, 120)}`,
    )
    .join(" · ");
}
