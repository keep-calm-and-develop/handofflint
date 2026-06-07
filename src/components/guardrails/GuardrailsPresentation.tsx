"use client";

import { useState } from "react";

import { FIGMA_COLORS } from "@/components/layout/figma-colors";
import type {
  GuardrailScenario,
  GuardrailsPresentationData,
} from "@/lib/guardrails-presentation";

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

function OutcomeBadge({ outcome }: { outcome: "kept" | "dropped" }) {
  const isKept = outcome === "kept";
  return (
    <span
      className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
        isKept
          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
          : "bg-red-100 text-red-800 border border-red-200"
      }`}
    >
      {isKept ? "Kept" : "Dropped"}
    </span>
  );
}

function LayerTag({ layer }: { layer: GuardrailScenario["layer"] }) {
  const labels = {
    groundedness: "Groundedness",
    cross_modal: "Cross-modal",
    pass: "Passes",
  };
  const colors = {
    groundedness: FIGMA_COLORS.orange,
    cross_modal: FIGMA_COLORS.purple,
    pass: FIGMA_COLORS.green,
  };
  return (
    <span
      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white"
      style={{ backgroundColor: colors[layer] }}
    >
      {labels[layer]}
    </span>
  );
}

function ScenarioCard({ scenario }: { scenario: GuardrailScenario }) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        scenario.outcome === "kept"
          ? "border-emerald-200 bg-emerald-50/30"
          : "border-red-200 bg-red-50/20"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="font-mono text-sm font-bold text-slate-900">
          {scenario.id}
        </span>
        <LayerTag layer={scenario.layer} />
        <OutcomeBadge outcome={scenario.outcome} />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-2">
        {scenario.title}
      </h3>
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
            Vision says
          </p>
          <p className="text-slate-700">{scenario.visionClaim}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
            JSON says
          </p>
          <p className="text-slate-700">{scenario.structuralEvidence}</p>
        </div>
      </div>
      {scenario.dropReason && (
        <p className="mt-3 text-xs font-mono text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
          {scenario.dropReason}
        </p>
      )}
    </div>
  );
}

type GuardrailsPresentationProps = {
  data: GuardrailsPresentationData;
};

export function GuardrailsPresentation({ data }: GuardrailsPresentationProps) {
  const [filter, setFilter] = useState<"all" | "dropped" | "kept">("all");

  const visible = data.scenarios.filter((s) => {
    if (filter === "dropped") return s.outcome === "dropped";
    if (filter === "kept") return s.outcome === "kept";
    return true;
  });

  return (
    <div className="bg-slate-50">
      <section className="bg-white py-12 sm:py-16 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-6">
            Mock vision claims · Real guardrail code · example.json
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Cross-modal guardrails
          </h1>
          <p className="mt-4 text-base text-slate-600 max-w-3xl leading-relaxed">
            Vision can hallucinate node IDs or misread layout. After Gemini
            streams findings, two deterministic filters vet each claim against
            the structural JSON from{" "}
            <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              {data.fixture.sourceFile}
            </code>
            — no second LLM call.
          </p>
        </div>
      </section>

      <section className="py-12 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Vision claims" value={data.rawInput.length} />
            <StatCard
              label="After groundedness"
              value={data.afterGroundedness.length}
            />
            <StatCard label="Final kept" value={data.finalOutput.length} />
            <StatCard
              label="Dropped"
              value={data.rawInput.length - data.finalOutput.length}
            />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Two-gate pipeline
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            {data.pipeline.map((step, i) => (
              <div key={step.step} className="flex items-center flex-1 min-w-0">
                <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Step {step.step}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {step.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">{step.description}</p>
                  <p className="text-lg font-bold text-slate-900 mt-3">
                    {step.outputCount}
                    <span className="text-xs font-normal text-slate-400">
                      {" "}
                      / {step.inputCount}
                    </span>
                  </p>
                </div>
                {i < data.pipeline.length - 1 && (
                  <span className="hidden sm:block text-slate-300 px-2">→</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <strong className="text-slate-800">Where it runs today:</strong>{" "}
            {data.appliedOn}.{" "}
            <strong className="text-slate-800">Not yet:</strong> {data.notYetOn}.
          </div>
        </div>
      </section>

      <section className="py-12 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Scenario walkthrough
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Five mock vision findings are run through the real{" "}
            <code className="font-mono text-xs">verifyGroundedness</code> and{" "}
            <code className="font-mono text-xs">crossModalFilter</code>{" "}
            functions. Two match the ReAct replay (2:3, 2:28) and survive both
            gates.
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {(["all", "dropped", "kept"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  filter === key
                    ? "text-white border-transparent"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
                style={
                  filter === key
                    ? { backgroundColor: FIGMA_COLORS.blue }
                    : undefined
                }
              >
                {key === "all" ? "All" : key === "dropped" ? "Dropped" : "Kept"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {visible.map((scenario) => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">The two rules</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900 mb-2">
                Rule 1 — Auto-layout vs clipping
              </p>
              <p className="text-slate-600">
                If category is <code className="font-mono text-xs">visual_clipping</code>{" "}
                but the node has <code className="font-mono text-xs">layoutMode</code>{" "}
                set (HORIZONTAL / VERTICAL), drop it. Auto-layout handles overflow —
                the screenshot likely misled the model.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900 mb-2">
                Rule 2 — Hidden / empty text
              </p>
              <p className="text-slate-600">
                If category is <code className="font-mono text-xs">typography_anomaly</code>{" "}
                but the node is <code className="font-mono text-xs">visible: false</code>{" "}
                or has no characters, drop it. You cannot critique copy the user
                never sees.
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Previous:{" "}
            <a href="/inspect-node" className="text-figma-blue hover:underline">
              inspect_node shallow lookup
            </a>
            {" · "}
            Series:{" "}
            <a href="/rag" className="text-figma-blue hover:underline">
              RAG
            </a>
            ,{" "}
            <a href="/react-loop" className="text-figma-blue hover:underline">
              ReAct loop
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
