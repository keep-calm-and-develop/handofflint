import { AIEnrichmentItem } from "@/lib/types";
import { buildFigmaNodeUrl } from "@/lib/figma/url";

interface AIEnrichmentPanelProps {
  enrichments: AIEnrichmentItem[] | null | undefined;
  fileKey: string;
}

const CATEGORY_STYLES: Record<string, string> = {
  hierarchy_clash: "bg-amber-900/40 text-amber-300 border-amber-700/60",
  typography_anomaly: "bg-purple-900/40 text-purple-300 border-purple-700/60",
  visual_clipping: "bg-rose-900/40 text-rose-300 border-rose-700/60",
  palette_pollution: "bg-blue-900/40 text-blue-300 border-blue-700/60",
  symmetry_break: "bg-indigo-900/40 text-indigo-300 border-indigo-700/60",
};

const FALLBACK_STYLE = "bg-zinc-800 text-zinc-300 border-zinc-600";

function formatCategory(category: string): string {
  return category.replace(/_/g, " ");
}

export function AIEnrichmentPanel({
  enrichments,
  fileKey,
}: AIEnrichmentPanelProps) {
  if (!enrichments || enrichments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center bg-zinc-900/50">
        <p className="text-sm text-zinc-500">
          No visual style anomalies detected by pre-flight checks.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <h3 className="font-semibold text-zinc-100 text-base">
          AI Pre-Flight Insights
        </h3>
        <span className="ml-auto text-xs font-mono text-zinc-500">
          {enrichments.length} {enrichments.length === 1 ? "issue" : "issues"}
        </span>
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        Inject these suggestions into your Cursor/v0 prompt for clean generated
        CSS.
      </p>

      <div className="grid gap-3">
        {enrichments.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${CATEGORY_STYLES[item.violationCategory] ?? FALLBACK_STYLE}`}
              >
                {formatCategory(item.violationCategory)}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={buildFigmaNodeUrl(fileKey, item.nodeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
                >
                  {item.nodeId}
                </a>
              </div>
            </div>

            <p className="text-sm text-zinc-300 mb-3">
              {item.perceptualFlawDescription}
            </p>

            <div className="rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-300 border border-zinc-800">
              <div className="text-[10px] uppercase tracking-wider font-sans text-zinc-500 mb-1 font-bold">
                Prompt Override
              </div>
              <span className="text-emerald-400"># Fix:</span>{" "}
              {item.codegenPromptSuggestion}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
