"use client";

import { useState } from "react";

import { FIGMA_COLORS } from "@/components/layout/figma-colors";
import type { ReactLoopPresentationData } from "@/lib/react-loop-presentation";
import type { VisionToolCallActivity } from "@/lib/agent/vision-stream";

function FlowDiagram() {
  const steps = ["See", "Think", "Act", "Observe", "Repeat"];
  return (
    <div className="flex flex-wrap items-center gap-2 justify-center">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <span
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: FIGMA_COLORS.purple }}
          >
            {step}
          </span>
          {i < steps.length - 1 && (
            <span className="text-slate-300 hidden sm:inline">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function ToolBadge({ name }: { name: string }) {
  const color =
    name === "inspect_node_properties"
      ? FIGMA_COLORS.orange
      : name === "search_layout_guidelines"
        ? FIGMA_COLORS.green
        : FIGMA_COLORS.blue;
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}

function ToolCallDetail({ call }: { call: VisionToolCallActivity }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <ToolBadge name={call.toolName} />
        <span className="text-emerald-700 font-semibold uppercase tracking-wide">
          {call.status}
        </span>
      </div>
      {call.inputSummary && (
        <p className="text-slate-600">
          <span className="text-slate-400">Input:</span> {call.inputSummary}
        </p>
      )}
      {call.outputSummary && (
        <p className="text-slate-800 mt-1">
          <span className="text-slate-400">Output:</span> {call.outputSummary}
        </p>
      )}
    </div>
  );
}

type ReActLoopPresentationProps = {
  data: ReactLoopPresentationData;
};

export function ReActLoopPresentation({ data }: ReActLoopPresentationProps) {
  const [activeTurn, setActiveTurn] = useState(0);
  const active = data.turns[activeTurn];

  return (
    <div className="bg-slate-50">
      <section className="bg-white py-12 sm:py-16 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-6">
            Mock replay · No LLM called
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            ReAct vision loop
          </h1>
          <p className="mt-4 text-base text-slate-600 max-w-3xl leading-relaxed">
            The agent does not answer in one shot. It{" "}
            <strong className="text-slate-800">Reasons</strong>,{" "}
            <strong className="text-slate-800">Acts</strong> with tools, and{" "}
            <strong className="text-slate-800">observes</strong> results — up to{" "}
            {data.maxSteps} steps. Figma context comes from{" "}
            <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              {data.fixture.sourceFile}
            </code>
            ; the SSE replay is from{" "}
            <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              {data.streamSourceFile}
            </code>
            .
          </p>
          <div className="mt-8">
            <FlowDiagram />
          </div>
        </div>
      </section>

      <section className="py-12 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Run stats (from mock capture)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Steps used" value={data.stepsUsed} hint={`max ${data.maxSteps}`} />
            <StatCard label="Tool calls" value={data.toolCallCount} />
            <StatCard label="Findings" value={data.enrichments.length} />
            <StatCard
              label="Figma fixture"
              value={data.fixture.fileName}
              hint={`${data.fixture.nodesIndexed} nodes`}
            />
          </div>
        </div>
      </section>

      <section className="py-12 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Step-by-step replay
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Click each step to see what the agent did and why. Data is parsed
            through the same{" "}
            <code className="font-mono text-xs bg-slate-100 px-1 rounded">
              vision-stream.ts
            </code>{" "}
            pipeline the wizard uses.
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {data.turns.map((turn, i) => (
              <button
                key={`${turn.turn}-${turn.kind}-${i}`}
                type="button"
                onClick={() => setActiveTurn(i)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  i === activeTurn
                    ? "text-white border-transparent"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
                style={
                  i === activeTurn
                    ? { backgroundColor: FIGMA_COLORS.blue }
                    : undefined
                }
              >
                {turn.kind === "observe"
                  ? "0 · Scan"
                  : turn.kind === "synthesize"
                    ? `${turn.turn} · Output`
                    : `${turn.turn} · ${turn.title}`}
              </button>
            ))}
          </div>

          {active && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: FIGMA_COLORS.purple }}
                >
                  {active.kind === "observe" ? "👁" : active.turn}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {active.title}
                  </h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    {active.kind === "tool"
                      ? "Tool turn"
                      : active.kind === "synthesize"
                        ? "Final synthesis"
                        : "Initial observation"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Agent reasoning (explained)
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {active.agentThought}
                </p>
              </div>

              {active.toolCall && <ToolCallDetail call={active.toolCall} />}

              {active.detail && (
                <p className="mt-4 text-sm text-slate-500">{active.detail}</p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Final structured output
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            After tool turns, the agent streams JSON. The client parser extracts
            enrichments and maps them to real node IDs from the investigation.
          </p>
          <div className="space-y-4">
            {data.enrichments.map((item) => (
              <div
                key={item.nodeId}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {item.nodeId}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${FIGMA_COLORS.orange}20`,
                      color: FIGMA_COLORS.orange,
                    }}
                  >
                    {item.violationCategory}
                  </span>
                </div>
                <p className="text-sm text-slate-700">
                  {item.perceptualFlawDescription}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Fix: {item.codegenPromptSuggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            How the stream becomes UI
          </h2>
          <div className="grid sm:grid-cols-4 gap-4">
            {data.streamPhases.map(({ phase, label }) => (
              <div
                key={phase}
                className="rounded-lg border border-slate-200 bg-white p-4 text-center"
              >
                <p className="text-xs font-mono text-slate-400">{phase}</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {label}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-500">
            SSE chunks like{" "}
            <code className="font-mono text-xs">start-step</code>,{" "}
            <code className="font-mono text-xs">tool-output-available</code>, and{" "}
            <code className="font-mono text-xs">text-delta</code> are consumed by{" "}
            <code className="font-mono text-xs">consumeVisionStreamChunks</code>{" "}
            — the same code path as the live wizard, just fed from a saved file
            here.
          </p>
        </div>
      </section>
    </div>
  );
}
