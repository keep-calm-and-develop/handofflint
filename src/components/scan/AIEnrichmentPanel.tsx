import { AIEnrichmentItem } from "@/lib/types";
import { buildFigmaNodeUrl } from "@/lib/figma/url";

interface AIEnrichmentPanelProps {
  enrichments: AIEnrichmentItem[] | null | undefined;
  fileKey: string;
}

const CATEGORY_STYLES: Record<string, string> = {
  hierarchy_clash:
    "bg-figma-orange/10 text-figma-orange border-figma-orange/30",
  typography_anomaly:
    "bg-figma-purple/10 text-figma-purple border-figma-purple/30",
  visual_clipping: "bg-red-50 text-red-700 border-red-200",
  palette_pollution:
    "bg-figma-blue/10 text-figma-blue border-figma-blue/30",
  symmetry_break: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const FALLBACK_STYLE = "bg-zinc-100 text-zinc-600 border-zinc-200";

function formatCategory(category: string): string {
  return category.replace(/_/g, " ");
}

export function AIEnrichmentPanel({
  enrichments,
  fileKey,
}: AIEnrichmentPanelProps) {
  if (!enrichments || enrichments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-sm text-zinc-400">
          No visual style anomalies detected by pre-flight checks.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-2 w-2 animate-pulse rounded-full bg-figma-purple" />
        <h3 className="text-base font-semibold text-zinc-900">
          AI Pre-Flight Insights
        </h3>
        <span className="ml-auto font-mono text-xs text-zinc-400">
          {enrichments.length} {enrichments.length === 1 ? "issue" : "issues"}
        </span>
      </div>

      <p className="mb-4 text-xs text-zinc-400">
        Inject these suggestions into your Cursor/v0 prompt for clean generated
        CSS.
      </p>

      <div className="grid gap-3">
        {enrichments.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:border-figma-blue/40"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${CATEGORY_STYLES[item.violationCategory] ?? FALLBACK_STYLE}`}
              >
                {formatCategory(item.violationCategory)}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={buildFigmaNodeUrl(fileKey, item.nodeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer font-mono text-xs text-figma-green underline underline-offset-2 transition-colors hover:text-figma-green/80"
                >
                  {item.nodeId}
                </a>
              </div>
            </div>

            <p className="mb-3 text-sm text-zinc-700">
              {item.perceptualFlawDescription}
            </p>

            <div className="rounded-lg border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-700">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Prompt Override
              </div>
              <span className="font-semibold text-figma-purple"># Fix:</span>{" "}
              {item.codegenPromptSuggestion}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
