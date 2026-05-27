"use client";

import { useState } from "react";

import type { ScanErrorResponse, ScanResponse } from "@/lib/types";

const SEVERITY_STYLES: Record<
  ScanResponse["findings"][number]["severity"],
  string
> = {
  critical: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  high: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  medium:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  low: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
};

const AUDIT_LABELS: Record<
  ScanResponse["findings"][number]["auditTool"],
  string
> = {
  layout: "Layout",
  naming: "Naming",
  hidden: "Hidden layers",
  spacing: "Spacing",
  contrast: "Contrast",
};

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function ScanDashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: ScanResponse | ScanErrorResponse = await res.json();
      if (!res.ok) {
        setError("error" in data ? data.error : "Scan failed");
        return;
      }
      setResult(data as ScanResponse);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-10">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Design handoff QA
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          HandOffLint
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Paste a Figma URL to get a Readiness Score and severity-sorted lint
          findings before marking designs ready for dev.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="figma-url" className="sr-only">
          Figma URL
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="figma-url"
            type="url"
            required
            placeholder="https://www.figma.com/design/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-800"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="shrink-0 rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {loading ? "Scanning…" : "Scan"}
          </button>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}

      {result && (
        <section className="mt-10 space-y-8">
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Readiness Score
              </p>
              <p
                className={`text-5xl font-semibold tabular-nums ${scoreColor(result.readinessScore)}`}
              >
                {result.readinessScore}
              </p>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                {result.findings.length} finding
                {result.findings.length === 1 ? "" : "s"}
              </p>
              {result.mock && (
                <p className="mt-1 text-amber-700 dark:text-amber-400">
                  Mock audit data (Week 1 stub)
                </p>
              )}
            </div>
          </div>

          {result.findings.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">
              No issues detected in this frame.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80">
                  <tr>
                    <th className="px-4 py-3 font-medium">Severity</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Layer</th>
                    <th className="px-4 py-3 font-medium">Finding</th>
                    <th className="px-4 py-3 font-medium">Figma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {result.findings.map((f) => (
                    <tr key={f.id} className="bg-white dark:bg-zinc-950">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${SEVERITY_STYLES[f.severity]}`}
                        >
                          {f.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {AUDIT_LABELS[f.auditTool]}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {f.nodeName}
                        <span className="mt-0.5 block text-zinc-400">
                          {f.nodeId}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-zinc-800 dark:text-zinc-200">
                        {f.message}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={f.figmaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
