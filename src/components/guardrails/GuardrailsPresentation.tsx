"use client";

import { useState } from "react";

import { FIGMA_COLORS } from "@/components/layout/figma-colors";
import type {
  GuardrailScenario,
  GuardrailsPresentationData,
  InputGuardrailExample,
  InputGuardrailGroup,
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

function OutcomeBadge({ outcome }: { outcome: "kept" | "dropped" | "allowed" | "blocked" }) {
  const styles = {
    kept: "bg-emerald-100 text-emerald-800 border-emerald-200",
    allowed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dropped: "bg-red-100 text-red-800 border-red-200",
    blocked: "bg-red-100 text-red-800 border-red-200",
  };
  const labels = {
    kept: "Kept",
    allowed: "Allowed",
    dropped: "Dropped",
    blocked: "Blocked",
  };

  return (
    <span
      className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${styles[outcome]}`}
    >
      {labels[outcome]}
    </span>
  );
}

function LayerTag({ layer }: { layer: GuardrailScenario["layer"] }) {
  const labels = {
    groundedness: "Real node check",
    cross_modal: "Structure check",
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

function InputExampleRow({ example }: { example: InputGuardrailExample }) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        example.outcome === "allowed"
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-red-200 bg-red-50/30"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-slate-900">
          {example.label}
        </span>
        <OutcomeBadge outcome={example.outcome} />
      </div>
      <p className="text-xs font-mono text-slate-600 bg-white/80 border border-slate-200 rounded px-2 py-1.5 break-all mb-2">
        {example.input}
      </p>
      <p className="text-sm text-slate-700">{example.plainEnglish}</p>
      {example.outcome === "blocked" && (
        <p className="mt-2 text-xs text-red-700">{example.reason}</p>
      )}
    </div>
  );
}

function InputGuardrailGroupCard({ group }: { group: InputGuardrailGroup }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">{group.title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        {group.summary}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Runs on: <span className="font-mono">{group.where}</span>
      </p>
      <div className="mt-4 space-y-3">
        {group.examples.map((example) => (
          <InputExampleRow key={example.id} example={example} />
        ))}
      </div>
    </div>
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
            What the AI saw
          </p>
          <p className="text-slate-700">{scenario.visionClaim}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
            What the Figma file says
          </p>
          <p className="text-slate-700">{scenario.structuralEvidence}</p>
        </div>
      </div>
      {scenario.dropReason && (
        <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
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

  const inputBlockedCount = data.inputGuardrails.reduce(
    (sum, group) =>
      sum + group.examples.filter((e) => e.outcome === "blocked").length,
    0,
  );
  const inputAllowedCount = data.inputGuardrails.reduce(
    (sum, group) =>
      sum + group.examples.filter((e) => e.outcome === "allowed").length,
    0,
  );

  return (
    <div className="bg-slate-50">
      <section className="bg-white py-12 sm:py-16 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-6">
            Real guardrail code · live examples · no extra AI calls
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Guardrails
          </h1>
          <p className="mt-4 text-base text-slate-600 max-w-3xl leading-relaxed">
            HandOffLint uses simple, deterministic checks — not another language
            model — to keep untrusted input out and to double-check what the
            vision agent claims. Think of it as a bouncer at the door and a
            fact-checker at the exit.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
              <p className="text-xs font-bold uppercase text-blue-700 mb-1">
                Before the agent runs
              </p>
              <p className="text-sm font-semibold text-slate-900">
                Input checks
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Validate URLs, file IDs, and manual text so poisoned links or
                hijack phrases never reach the RAG search or vision step.
              </p>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5">
              <p className="text-xs font-bold uppercase text-purple-700 mb-1">
                After the agent runs
              </p>
              <p className="text-sm font-semibold text-slate-900">
                Output checks
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Compare each AI finding to the real Figma JSON — drop ghost layer
                IDs and claims the structure already disproves.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Part 1 — Input checks
          </h2>
          <p className="text-sm text-slate-600 mb-6 max-w-3xl">
            These run on the <code className="font-mono text-xs bg-slate-100 px-1 rounded">/api/agent</code>{" "}
            routes before Gemini starts. Each example below is evaluated by the
            same TypeScript functions used in production.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Example inputs"
              value={inputAllowedCount + inputBlockedCount}
            />
            <StatCard label="Allowed" value={inputAllowedCount} />
            <StatCard label="Blocked" value={inputBlockedCount} />
          </div>

          <div className="space-y-6">
            {data.inputGuardrails.map((group) => (
              <InputGuardrailGroupCard key={group.title} group={group} />
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <strong className="text-slate-800">Pinned manual URL:</strong> once
            you pass a design manual link in the wizard, the agent cannot swap
            it for a different URL during tool calls — only your vetted link is
            used for guideline search.
          </div>
        </div>
      </section>

      <section className="py-12 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Part 2 — Output checks
          </h2>
          <p className="text-sm text-slate-600 mb-6 max-w-3xl">
            After vision finishes, findings are compared to the structural JSON
            from{" "}
            <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              {data.fixture.sourceFile}
            </code>
            . Five sample AI claims are run through the real filter functions.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="AI claims" value={data.rawInput.length} />
            <StatCard
              label="After node check"
              value={data.afterGroundedness.length}
            />
            <StatCard label="Final kept" value={data.finalOutput.length} />
            <StatCard
              label="Dropped"
              value={data.rawInput.length - data.finalOutput.length}
            />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Three-step filter
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
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

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 mb-8">
            <strong className="text-slate-800">Live today:</strong>{" "}
            {data.appliedOn}.{" "}
            <strong className="text-slate-800">Coming next:</strong>{" "}
            {data.notYetOn}.
          </div>

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
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            The two output rules
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900 mb-2">
                Rule 1 — Auto Layout beats “clipping”
              </p>
              <p className="text-slate-600">
                If the AI says text is clipped but the layer already uses Auto
                Layout, we drop the warning. The screenshot probably fooled the
                model — the JSON shows overflow is handled.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900 mb-2">
                Rule 2 — Hidden text is not user-facing
              </p>
              <p className="text-slate-600">
                If the AI flags a typo on a hidden or empty text layer, we drop
                it. End users never see that copy, so it should not block a
                handoff.
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Related:{" "}
            <a href="/rag" className="text-figma-blue hover:underline">
              How guideline search works
            </a>
            {" · "}
            <a href="/react-loop" className="text-figma-blue hover:underline">
              ReAct investigation loop
            </a>
            {" · "}
            <a href="/agent" className="text-figma-blue hover:underline">
              Try the agent wizard
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
