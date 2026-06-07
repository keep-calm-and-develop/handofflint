"use client";

import { useState } from "react";

import { FIGMA_COLORS } from "@/components/layout/figma-colors";
import type { InspectNodePresentationData } from "@/lib/inspect-node-presentation";

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

function JsonBlock({
  title,
  data,
  highlightKeys,
  variant,
}: {
  title: string;
  data: unknown;
  highlightKeys?: string[];
  variant: "full" | "shallow";
}) {
  const text = JSON.stringify(data, null, 2);
  const lines = text.split("\n");

  return (
    <div className="flex flex-col min-h-0">
      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
        {title}
      </p>
      <pre
        className={`flex-1 rounded-lg border p-4 overflow-auto text-[11px] font-mono leading-relaxed max-h-80 ${
          variant === "full"
            ? "border-red-200 bg-red-50/30 text-slate-800"
            : "border-emerald-200 bg-emerald-50/30 text-slate-800"
        }`}
      >
        {lines.map((line) => {
          const isChildren =
            variant === "full" && line.includes('"children"');
          const isHighlight =
            highlightKeys?.some((key) => line.includes(`"${key}"`)) ?? false;
          return (
            <span
              key={line}
              className={`block ${
                isChildren
                  ? "bg-red-100 text-red-800 font-semibold"
                  : isHighlight
                    ? "bg-amber-100"
                    : ""
              }`}
            >
              {line}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

type InspectNodePresentationProps = {
  data: InspectNodePresentationData;
};

export function InspectNodePresentation({ data }: InspectNodePresentationProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const example = data.examples[activeIndex];
  const savings =
    example.fullJsonChars > 0
      ? Math.round(
          ((example.fullJsonChars - example.shallowJsonChars) /
            example.fullJsonChars) *
            100,
        )
      : 0;

  return (
    <div className="bg-slate-50">
      <section className="bg-white py-12 sm:py-16 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-6">
            Fixture: example.json · No LLM
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            inspect_node — shallow cache lookup
          </h1>
          <p className="mt-4 text-base text-slate-600 max-w-3xl leading-relaxed">
            The agent cannot receive the full Figma tree — it would overflow the
            context window. Instead,{" "}
            <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              inspect_node_properties
            </code>{" "}
            does an O(1) cache lookup and returns only the parent layer&apos;s
            props, with <strong className="text-slate-800">children stripped</strong>.
          </p>
        </div>
      </section>

      <section className="py-12 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Fixture file" value={data.fixture.sourceFile} />
            <StatCard label="Figma file" value={data.fixture.fileName} />
            <StatCard
              label="Nodes indexed"
              value={data.fixture.nodesIndexed}
              hint={data.fixture.frameName}
            />
            <StatCard
              label="Cache lookup"
              value="O(1)"
              hint="Map by nodeId"
            />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Flat index pipeline
          </h2>
          <div className="grid sm:grid-cols-4 gap-4">
            {data.indexSteps.map(({ step, title, detail }) => (
              <div
                key={step}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <span
                  className="inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold text-white mb-3"
                  style={{ backgroundColor: FIGMA_COLORS.blue }}
                >
                  {step}
                </span>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Examples from{" "}
            <code className="font-mono text-base">{data.fixture.sourceFile}</code>
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Nodes 2:3 and 2:28 are loaded from the vaxin fixture — the same mock
            payload MSW serves in dev. Child subtrees under 2:28 are real JSON
            from the file; only the shallow tool output omits them.
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {data.examples.map((ex, i) => (
              <button
                key={ex.nodeId}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  i === activeIndex
                    ? "text-white border-transparent"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
                style={
                  i === activeIndex
                    ? { backgroundColor: FIGMA_COLORS.orange }
                    : undefined
                }
              >
                {ex.nodeId} · {ex.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Why the agent called this
            </p>
            <p className="text-sm text-slate-700">{example.whyAgentCalled}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Cached (with children)"
              value={`${example.fullJsonChars.toLocaleString()} chars`}
              hint={
                example.childCount > 0
                  ? `${example.childCount} children included`
                  : "leaf node"
              }
            />
            <StatCard
              label="Sent to agent"
              value={`${example.shallowJsonChars.toLocaleString()} chars`}
              hint="children stripped"
            />
            <StatCard
              label="Token savings"
              value={`${savings}%`}
              hint="smaller tool response"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <JsonBlock
              title="In cache (full node)"
              data={example.cachedNode}
              variant="full"
            />
            <JsonBlock
              title="Tool output (shallow)"
              data={example.shallowProperties}
              highlightKeys={example.highlightKeys}
              variant="shallow"
            />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Design choices</h2>
          <ul className="grid sm:grid-cols-3 gap-4 text-sm text-slate-600">
            <li className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-slate-900 block mb-1">fileKey in closure</strong>
              The model only passes nodeId — file context is bound when the tool
              is created server-side.
            </li>
            <li className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-slate-900 block mb-1">Surgical lookups</strong>
              Agent pulls one layer at a time instead of re-sending the whole
              screen tree each turn.
            </li>
            <li className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-slate-900 block mb-1">Shared cache</strong>
              Same flat index powers deterministic linters (step 2) and vision
              tools (step 3).
            </li>
          </ul>
          <p className="mt-6 text-sm text-slate-500">
            Previous:{" "}
            <a href="/react-loop" className="text-figma-blue hover:underline">
              ReAct loop replay
            </a>
            {" · "}
            Next topic: cross-modal guardrails (vision vs structure).
          </p>
        </div>
      </section>
    </div>
  );
}
