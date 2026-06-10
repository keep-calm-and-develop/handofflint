"use client";

import { useState } from "react";

import { FIGMA_COLORS } from "@/components/layout/figma-colors";
import type { EvalPresentationData } from "@/lib/evals/types";

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

function StatusBadge({
  locked,
  runsCompleted,
  runsRequired,
}: {
  locked: boolean;
  runsCompleted: number;
  runsRequired: number;
}) {
  if (locked) {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase text-emerald-800">
        Locked
      </span>
    );
  }

  if (runsCompleted >= runsRequired) {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold uppercase text-amber-800">
        Ready to lock
      </span>
    );
  }

  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold uppercase text-slate-600">
      Capturing ({runsCompleted}/{runsRequired})
    </span>
  );
}

function CaseCard({
  item,
}: {
  item: EvalPresentationData["cases"][number];
}) {
  const [showNodes, setShowNodes] = useState(false);

  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 p-4">
          {item.hasImage ? (
            <img
              src={item.meta.imagePath}
              alt={item.meta.frameName}
              className="mx-auto max-h-[420px] w-auto rounded-lg border border-slate-200 bg-white shadow-sm"
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
              Image missing — run pnpm eval:setup
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{item.meta.label}</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                {item.meta.fileKey} · node {item.meta.nodeId}
              </p>
            </div>
            <StatusBadge
              locked={item.status.locked}
              runsCompleted={item.status.runsCompleted}
              runsRequired={item.summary?.runsRequired ?? 10}
            />
          </div>

          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-slate-500 uppercase tracking-wide">Profile</dt>
              <dd className="font-semibold text-slate-900">{item.meta.layoutProfile}</dd>
            </div>
            <div>
              <dt className="text-slate-500 uppercase tracking-wide">Nodes source</dt>
              <dd className="font-semibold text-slate-900">{item.meta.nodesSource}</dd>
            </div>
            {item.meta.imageSourceUrl && (
              <div className="col-span-2">
                <dt className="text-slate-500 uppercase tracking-wide">Image source</dt>
                <dd className="font-mono text-[10px] text-slate-700 break-all">
                  {item.meta.imageSourceUrl}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500 uppercase tracking-wide">Pass rate</dt>
              <dd className="font-semibold text-slate-900">
                {item.summary?.passRate != null ? `${item.summary.passRate}%` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 uppercase tracking-wide">Expected findings</dt>
              <dd className="font-semibold text-slate-900">{item.expected.length}</dd>
            </div>
          </dl>

          {item.expected.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                Golden labels
              </h4>
              <ul className="space-y-2">
                {item.expected.map((finding) => (
                  <li
                    key={`${finding.nodeId}-${finding.violationCategory}`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  >
                    <span
                      className="font-bold uppercase"
                      style={{ color: FIGMA_COLORS.purple }}
                    >
                      {finding.violationCategory}
                    </span>
                    <span className="text-slate-500"> · {finding.nodeId}</span>
                    {finding.descriptionIncludes && (
                      <p className="text-slate-600 mt-1">
                        includes “{finding.descriptionIncludes}”
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.recentRuns.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                Recent captured runs
              </h4>
              <ul className="space-y-1 text-xs text-slate-600 font-mono">
                {item.recentRuns.map((run) => (
                  <li key={run.runIndex}>
                    run {String(run.runIndex).padStart(2, "0")} · verified=
                    {run.verifiedCount}
                    {run.error ? ` · error` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowNodes((open) => !open)}
            className="text-xs font-semibold text-slate-700 underline"
          >
            {showNodes ? "Hide" : "Show"} raw nodes JSON
          </button>

          {showNodes && (
            <pre className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-[10px] text-slate-200">
              {item.nodesJsonPreview}
            </pre>
          )}
        </div>
      </div>
    </article>
  );
}

export function EvalsPresentation({ data }: { data: EvalPresentationData }) {
  const lockedCount = data.cases.filter((item) => item.status.locked).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <header className="max-w-3xl">
        <p
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: FIGMA_COLORS.green }}
        >
          LLM Evaluations
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Vision agent golden dataset
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
          {data.methodology}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Golden cases" value={data.cases.length} hint="mobile-app profile" />
        <StatCard
          label="Runs per case"
          value={data.manifest.runsPerCase}
          hint="captured offline, one at a time"
        />
        <StatCard
          label="Overall pass rate"
          value={data.overallPassRate != null ? `${data.overallPassRate}%` : "—"}
          hint={`${lockedCount}/${data.cases.length} cases locked`}
        />
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 space-y-3">
        <h2 className="font-bold text-amber-900">Honest scope — not production-ready at scale</h2>
        <p className="text-xs sm:text-sm leading-relaxed">
          These evals prove we can <strong className="font-semibold">measure</strong> vision-agent
          behavior and show it works well on focused defects (typos, hierarchy clashes).
          They also expose real variance on complex frames — the Order Details Modal case
          reaches only 40% full-match. That is expected for a capstone POC, not a failure
          to document.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">Known limitations</h3>
            <ul className="list-disc list-inside space-y-1 text-amber-950/90">
              <li>3 cases, mobile-app profile only</li>
              <li>Non-deterministic model — same input, different findings</li>
              <li>Quota failures excluded from pass-rate denominator</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">Improvements needed</h3>
            <ul className="list-disc list-inside space-y-1 text-amber-950/90">
              <li>Larger golden set and layout-profile coverage</li>
              <li>Consensus voting and per-finding confidence</li>
              <li>Region-based inspection for large modals</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 space-y-2">
        <h2 className="font-bold text-slate-900">Capture workflow</h2>
        <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
          <li>
            <code className="bg-white px-1 rounded">pnpm eval:setup</code> — copy
            fixtures from example.json + figma-output
          </li>
          <li>
            Start dev server with{" "}
            <code className="bg-white px-1 rounded">EVAL_ALLOW_LOCAL_IMAGES=true</code>
          </li>
          <li>
            <code className="bg-white px-1 rounded">pnpm eval:capture --case vaxin-1-4 --run 1</code>{" "}
            … repeat through run 10
          </li>
          <li>
            <code className="bg-white px-1 rounded">pnpm eval:lock --case vaxin-1-4 --write</code>{" "}
            after review
          </li>
          <li>Repeat for the next case only after the current case is locked</li>
        </ol>
      </section>

      <div className="space-y-6">
        {data.cases.map((item) => (
          <CaseCard key={item.meta.id} item={item} />
        ))}
      </div>

      <p className="text-sm text-slate-500 border-t border-slate-200 pt-6">
        Related:{" "}
        <a href="/guardrails" className="text-figma-blue hover:underline">
          Cross-modal guardrails
        </a>
        {" · "}
        <a href="/react-loop" className="text-figma-blue hover:underline">
          ReAct vision loop
        </a>
        {" · "}
        <a href="/#evals" className="text-figma-blue hover:underline">
          Home overview
        </a>
        {" · "}
        <a href="/agent" className="text-figma-blue hover:underline">
          Try the agent wizard
        </a>
      </p>
    </div>
  );
}
