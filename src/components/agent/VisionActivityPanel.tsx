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
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "ok":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "not_found":
      return "border-zinc-600 bg-zinc-900 text-zinc-400";
    case "error":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-400";
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100">{label}</p>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{toolName}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] ${statusStyles(status)}`}
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

      <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
        {inputSummary && <p>{inputSummary}</p>}
        {nodeId && !inputSummary?.includes(nodeId) && (
          <p>
            Target node: <span className="font-mono text-zinc-300">{nodeId}</span>
          </p>
        )}
        {outputSummary && (
          <p className="text-zinc-300">
            <span className="text-zinc-500">Result:</span> {outputSummary}
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
            Agent Investigation
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            {phaseLabel(
              activity.phase,
              toolCallCount,
              activity.agentTurn,
              loading,
            )}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.25em] ${
            loading
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : activity.phase === "complete"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-400"
          }`}
        >
          {loading ? "Live" : activity.phase === "complete" ? "Done" : "Idle"}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {activity.phase === "idle" && !loading && (
          <p className="text-sm text-zinc-500">
            Launch the vision agent to watch tool calls stream in as the model
            investigates.
          </p>
        )}

        {activity.phase === "connecting" && loading && (
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Connecting to vision stream…
          </div>
        )}

        {turns.map(({ turn, toolCalls }) => (
          <div key={turn} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-300">
                {turn}
              </span>
              <p className="text-sm font-medium text-zinc-200">
                Agent turn {turn}
              </p>
              <span className="text-xs text-zinc-500">
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
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
            Synthesizing visual critique from findings…
          </div>
        )}

        {activity.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {activity.error}
          </div>
        )}

        {showResults && (
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-100">Parsed findings</p>
              <span className="text-xs text-zinc-500">
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
                <details className="rounded-xl border border-zinc-800 bg-zinc-950/80">
                  <summary className="cursor-pointer select-none px-4 py-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                    Raw agent analysis (JSON parse failed — expand to inspect)
                  </summary>
                  <pre className="overflow-x-auto whitespace-pre-wrap wrap-break-word px-4 pb-4 pt-2 font-mono text-[11px] leading-relaxed text-zinc-300">
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
