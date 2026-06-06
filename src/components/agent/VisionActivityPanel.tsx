"use client";

import { AIEnrichmentPanel } from "@/components/scan/AIEnrichmentPanel";
import {
  groupToolCallsByTurn,
  type VisionActivityPhase,
  type VisionActivityState,
  type VisionToolCallStatus,
} from "@/lib/agent/vision-stream";

function phaseLabel(
  phase: VisionActivityPhase,
  toolCallCount: number,
  agentTurn: number,
  loading: boolean,
): string {
  if (loading) {
    switch (phase) {
      case "connecting":
        return "Connecting to vision stream…";
      case "synthesizing":
        return "Writing visual critique from findings…";
      case "investigating":
        return `Agent turn ${Math.max(agentTurn, 1)} · ${toolCallCount} tool call${toolCallCount === 1 ? "" : "s"}`;
      default:
        return "Streaming agent activity…";
    }
  }

  if (phase === "complete") return "Investigation finished";
  if (phase === "error") return "Investigation failed";
  return "Ready to launch";
}

function statusStyles(status: VisionToolCallStatus): string {
  switch (status) {
    case "running":
      return "border-figma-purple bg-figma-purple/10 text-figma-purple";
    case "ok":
      return "border-figma-green bg-figma-green/10 text-figma-green";
    case "not_found":
      return "border-zinc-200 bg-zinc-50 text-zinc-500";
    case "error":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
}

function statusLabel(status: VisionToolCallStatus): string {
  switch (status) {
    case "running":
      return "Running";
    case "ok":
      return "Done";
    case "not_found":
      return "Not found";
    case "error":
      return "Failed";
    default:
      return status;
  }
}

function ToolCallCard({
  toolName,
  label,
  inputSummary,
  outputSummary,
  status,
  nodeId,
}: {
  toolName: string;
  label: string;
  inputSummary: string | null;
  outputSummary: string | null;
  status: VisionToolCallStatus;
  nodeId: string | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 font-mono text-[13px] shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900">{label}</p>
          <p className="mt-0.5 text-[11px] text-zinc-400">{toolName}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusStyles(status)}`}
        >
          {status === "running" ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              {statusLabel(status)}
            </span>
          ) : (
            statusLabel(status)
          )}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-zinc-500">
        {inputSummary && <p>{inputSummary}</p>}
        {nodeId && !inputSummary?.includes(nodeId) && (
          <p>
            Target node: <span className="text-zinc-700">{nodeId}</span>
          </p>
        )}
        {outputSummary && (
          <p className="text-zinc-700">
            <span className="text-zinc-400">Result:</span> {outputSummary}
          </p>
        )}
      </div>
    </div>
  );
}

export function VisionActivityPanel({
  activity,
  loading,
  fileKey,
}: {
  activity: VisionActivityState;
  loading: boolean;
  fileKey: string;
}) {
  const toolCallCount = activity.toolCalls.length;
  const turns = groupToolCallsByTurn(activity.toolCalls);
  const showResults =
    activity.enrichments !== null ||
    (activity.phase === "complete" && !loading);

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        loading ? "border-figma-purple/40" : "border-zinc-200"
      }`}
    >
      <div
        className={`flex items-center justify-between gap-3 border-b pb-4 ${
          loading ? "border-figma-purple/20" : "border-zinc-200"
        }`}
      >
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-[0.35em] ${
              loading ? "text-figma-purple" : "text-zinc-400"
            }`}
          >
            Agent Investigation
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {phaseLabel(
              activity.phase,
              toolCallCount,
              activity.agentTurn,
              loading,
            )}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${
            loading
              ? "border-figma-purple bg-figma-purple/10 text-figma-purple"
              : activity.phase === "complete"
                ? "border-figma-green bg-figma-green/10 text-figma-green"
                : "border-zinc-200 bg-zinc-50 text-zinc-500"
          }`}
        >
          {loading ? "Live" : activity.phase === "complete" ? "Done" : "Idle"}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {activity.phase === "idle" && !loading && (
          <p className="text-sm text-zinc-400">
            Launch the vision agent to watch tool calls stream in as the model
            investigates.
          </p>
        )}

        {activity.phase === "connecting" && loading && (
          <div className="flex items-center gap-3 rounded-xl border border-figma-purple/30 bg-figma-purple/5 px-4 py-3 font-mono text-sm text-zinc-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-figma-purple" />
            Connecting to vision stream…
          </div>
        )}

        {turns.map(({ turn, toolCalls }) => (
          <div key={turn} className="space-y-3 font-mono">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-figma-purple/15 text-xs font-bold text-figma-purple">
                {turn}
              </span>
              <p className="text-sm font-semibold text-figma-purple">
                Agent turn {turn}
              </p>
              <span className="text-xs text-zinc-400">
                {toolCalls.length} tool call{toolCalls.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-2 pl-8">
              {toolCalls.map((call) => (
                <ToolCallCard key={call.id} {...call} />
              ))}
            </div>
          </div>
        ))}

        {activity.phase === "synthesizing" && loading && (
          <div className="flex items-center gap-3 rounded-xl border border-figma-purple/30 bg-figma-purple/5 px-4 py-3 font-mono text-sm text-zinc-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-figma-purple" />
            Synthesizing visual critique from findings…
          </div>
        )}

        {activity.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-mono text-sm text-red-700">
            {activity.error}
          </div>
        )}

        {showResults && (
          <div className="space-y-3 border-t border-zinc-200 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-900">
                Parsed findings
              </p>
              <span className="text-xs text-zinc-400">
                {activity.enrichments?.length ?? 0} issue
                {(activity.enrichments?.length ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
            <AIEnrichmentPanel
              enrichments={activity.enrichments}
              fileKey={fileKey}
            />
            {(activity.enrichments?.length ?? 0) === 0 &&
              activity.rawAnalysis && (
                <details className="rounded-xl border border-zinc-200 bg-zinc-50">
                  <summary className="cursor-pointer select-none px-4 py-3 text-xs text-zinc-500 transition-colors hover:text-zinc-800">
                    Raw agent analysis (JSON parse failed — expand to inspect)
                  </summary>
                  <pre className="wrap-break-word overflow-x-auto whitespace-pre-wrap px-4 pt-2 pb-4 font-mono text-[11px] leading-relaxed text-zinc-700">
                    {activity.rawAnalysis}
                  </pre>
                </details>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
