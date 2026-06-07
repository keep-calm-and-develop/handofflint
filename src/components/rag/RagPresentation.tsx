"use client";

import { useMemo, useState } from "react";

import { FIGMA_COLORS } from "@/components/layout/figma-colors";
import type { RagPresentationData } from "@/lib/rag-presentation";

const PIPELINE_STEPS = [
  { id: "fetch", label: "1. Fetch", desc: "Download raw markdown" },
  { id: "chunk", label: "2. Chunk", desc: "Split by paragraph" },
  { id: "tokenize", label: "3. Tokenize", desc: "Clean query words" },
  { id: "score", label: "4. Score", desc: "Keyword overlap" },
  { id: "retrieve", label: "5. Retrieve", desc: "Top 3 sections" },
] as const;

function PipelineFlow() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
      {PIPELINE_STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1 min-w-0">
          <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div
              className="text-xs font-bold uppercase tracking-wide mb-1"
              style={{ color: FIGMA_COLORS.blue }}
            >
              {step.label}
            </div>
            <div className="text-sm font-semibold text-slate-900">{step.desc}</div>
          </div>
          {i < PIPELINE_STEPS.length - 1 && (
            <div
              className="hidden sm:block w-6 text-slate-300 text-center shrink-0"
              aria-hidden
            >
              →
            </div>
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

function TokenPill({ token, matched }: { token: string; matched?: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono border ${
        matched
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-slate-50 border-slate-200 text-slate-700"
      }`}
    >
      {token}
    </span>
  );
}

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
  const width = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return (
    <div className="flex items-center gap-3 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${width}%`,
            backgroundColor: FIGMA_COLORS.blue,
          }}
        />
      </div>
      <span className="text-sm font-bold text-slate-900 w-4 text-right">{score}</span>
    </div>
  );
}

function Section({
  id,
  step,
  title,
  children,
}: {
  id: string;
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-12 border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-6">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: FIGMA_COLORS.purple }}
          >
            {step}
          </span>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

type RagPresentationProps = {
  data: RagPresentationData;
};

export function RagPresentation({ data }: RagPresentationProps) {
  const [activeQueryIndex, setActiveQueryIndex] = useState(0);
  const activeQuery = data.queries[activeQueryIndex];

  const maxScore = useMemo(
    () => Math.max(...activeQuery.rankedChunks.map((c) => c.score), 1),
    [activeQuery.rankedChunks],
  );

  return (
    <div className="bg-slate-50">
      <section className="bg-white py-12 sm:py-16 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-6">
            search_guides · Zero-cost RAG
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How keyword RAG works
          </h1>
          <p className="mt-4 text-base text-slate-600 max-w-3xl leading-relaxed">
            The agent&apos;s <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded">search_guides</code>{" "}
            tool fetches a remote design manual, splits it into paragraphs, ranks
            them by keyword overlap, and returns the top 3 matches — no
            embeddings, no vector DB.
          </p>
          <div className="mt-8">
            <PipelineFlow />
          </div>
        </div>
      </section>

      <Section id="fetch" step="1" title="Fetch — ingest remote markdown">
        <p className="text-sm text-slate-600 mb-6">
          The pipeline starts with a plain HTTP fetch of the raw GitHub file.
          No preprocessing — just the full markdown text in memory.
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-900 p-4 mb-6 overflow-x-auto">
          <code className="text-xs text-emerald-300 font-mono break-all">
            GET {data.url}
          </code>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Bytes fetched" value={data.fetchStats.bytes.toLocaleString()} />
          <StatCard label="Lines" value={data.fetchStats.lines} />
          <StatCard
            label="Source"
            value="GitHub Raw"
            hint="fire-your-design-team.md"
          />
        </div>
      </Section>

      <Section id="chunk" step="2" title="Chunk — split by double newline">
        <p className="text-sm text-slate-600 mb-6">
          Markdown is split on <code className="font-mono text-xs bg-slate-100 px-1 rounded">\n\n+</code>{" "}
          (paragraph boundaries). Short fragments like <code className="font-mono text-xs">---</code>{" "}
          are dropped, but markdown headings (e.g.{" "}
          <code className="font-mono text-xs">## Typography System</code>) are kept —
          they label sections and help topic matching.
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Raw splits" value={data.chunkStats.rawCount} />
          <StatCard
            label="Kept"
            value={data.chunkStats.keptCount}
            hint="paragraphs + headings"
          />
          <StatCard
            label="Dropped"
            value={data.chunkStats.droppedCount}
            hint="short noise only"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Kept chunks (sample)
            </h3>
            <div className="space-y-3">
              {data.keptChunks.map((chunk) => (
                <div
                  key={chunk.index}
                  className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-emerald-700">
                      chunk #{chunk.index}
                    </span>
                    <span className="text-xs text-emerald-600">{chunk.length} chars</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {chunk.text.slice(0, 160)}
                    {chunk.text.length > 160 ? "…" : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Dropped as noise (if any)
            </h3>
            <div className="space-y-2">
              {data.droppedExamples.length > 0 ? (
                data.droppedExamples.map((text) => (
                  <div
                    key={text}
                    className="rounded-lg border border-red-200 bg-red-50/40 px-4 py-3 flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-slate-600 font-mono">{text}</span>
                    <span className="text-xs text-red-600 shrink-0">
                      {text.length} chars
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  All splits in this document were kept — section headings now
                  count as valid chunks.
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Visual: each blank line pair in the source becomes a split point.
              Short fragments between splits never reach scoring.
            </p>
          </div>
        </div>
      </Section>

      <Section id="tokenize" step="3" title="Tokenize — normalize query words">
        <p className="text-sm text-slate-600 mb-6">
          The query string is lowercased and split on non-alphanumeric characters.
          Duplicates in the query count once when scoring.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
            Example query
          </div>
          <p className="text-base font-mono text-slate-800 mb-4">
            &quot;{activeQuery.query}&quot;
          </p>
          <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
            Tokens
          </div>
          <div className="flex flex-wrap gap-2">
            {activeQuery.tokens.map((token) => (
              <TokenPill key={token} token={token} />
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            <code className="font-mono">Auto-Layout</code> →{" "}
            <code className="font-mono">auto</code>,{" "}
            <code className="font-mono">layout</code> ·{" "}
            <code className="font-mono">flex-wrap: nowrap</code> →{" "}
            <code className="font-mono">flex</code>,{" "}
            <code className="font-mono">wrap</code>,{" "}
            <code className="font-mono">nowrap</code>
          </p>
        </div>
      </Section>

      <Section id="score" step="4" title="Score — keyword intersection">
        <p className="text-sm text-slate-600 mb-6">
          Each chunk gets a score equal to how many unique query tokens appear in
          that chunk. More overlapping keywords = higher rank.
        </p>

        <div className="mb-6 flex flex-wrap gap-2">
          {data.queries.map((q, i) => (
            <button
              key={q.query}
              type="button"
              onClick={() => setActiveQueryIndex(i)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                i === activeQueryIndex
                  ? "text-white border-transparent"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
              style={
                i === activeQueryIndex
                  ? { backgroundColor: FIGMA_COLORS.blue }
                  : undefined
              }
            >
              {q.query}
            </button>
          ))}
        </div>

        {activeQuery.status === "no_matches" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            <strong>No matches.</strong> None of the {data.chunkStats.keptCount}{" "}
            chunks contain any query tokens. The agent gets a{" "}
            <code className="font-mono text-xs">no_matches</code> response instead
            of hallucinating guidelines.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span>
                <strong className="text-slate-900">{activeQuery.totalMatches}</strong>{" "}
                chunks matched
              </span>
              <span>
                Min score:{" "}
                <strong className="text-slate-900">{activeQuery.minScore}</strong>
                {activeQuery.minScore === 2 && (
                  <span className="text-slate-500">
                    {" "}
                    (query has 5+ tokens — filters single-word false positives)
                  </span>
                )}
              </span>
            </div>

            {activeQuery.rankedChunks.map((chunk, i) => (
              <div
                key={`${chunk.preview}-${i}`}
                className={`rounded-lg border p-4 ${
                  chunk.includedInTopK
                    ? "border-blue-200 bg-blue-50/40"
                    : chunk.filteredByMinScore
                      ? "border-amber-200 bg-amber-50/30"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
                  <ScoreBar score={chunk.score} maxScore={maxScore} />
                  <div className="flex flex-wrap gap-1.5">
                    {chunk.matchedKeywords.map((kw) => (
                      <TokenPill key={kw} token={kw} matched />
                    ))}
                  </div>
                  {chunk.includedInTopK && chunk.rank !== null && (
                    <span
                      className="text-xs font-bold uppercase shrink-0"
                      style={{ color: FIGMA_COLORS.blue }}
                    >
                      #{chunk.rank} in context
                    </span>
                  )}
                  {chunk.filteredByMinScore && (
                    <span className="text-xs font-semibold text-amber-700 shrink-0">
                      Filtered (score &lt; {activeQuery.minScore})
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700">{chunk.preview}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section id="retrieve" step="5" title="Retrieve — top 3 joined context">
        <p className="text-sm text-slate-600 mb-6">
          Matching chunks are sorted by score, filtered by the minimum threshold,
          limited to 3, then joined with{" "}
          <code className="font-mono text-xs bg-slate-100 px-1 rounded">\n\n---\n\n</code>.
          This string is injected into the agent prompt as grounded context.
        </p>

        {activeQuery.status === "ok" ? (
          <div className="rounded-lg border border-slate-200 bg-slate-900 p-6 overflow-x-auto">
            <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
              {activeQuery.context}
            </pre>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 italic">
            Empty context — pipeline returns status: no_matches
          </div>
        )}

        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Short query (≤ 4 tokens)
            </h3>
            <p className="text-sm text-slate-600">
              <code className="font-mono text-xs">minScore = 1</code> — any single
              keyword match qualifies.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Long query (≥ 5 tokens)
            </h3>
            <p className="text-sm text-slate-600">
              <code className="font-mono text-xs">minScore = 2</code> — prevents one
              common word (e.g. &quot;primary&quot;) from returning unrelated sections.
            </p>
          </div>
        </div>
      </Section>

      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Why this approach?</h2>
          <ul className="grid sm:grid-cols-3 gap-4 text-sm text-slate-600">
            <li className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-slate-900 block mb-1">Zero cost</strong>
              No embedding API calls or vector database — just string matching.
            </li>
            <li className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-slate-900 block mb-1">Deterministic</strong>
              Same query always returns the same chunks. Easy to debug and demo.
            </li>
            <li className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-slate-900 block mb-1">Grounded</strong>
              Agent recommendations cite real paragraphs from the design manual.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
