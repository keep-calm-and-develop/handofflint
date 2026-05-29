interface ReadinessScoreCardProps {
  score: number;
  scoreColorClass: string;
  findingCountLabel: string;
  auditsSkipped: boolean;
  auditStatusLabel: string | null;
  figmaSkippedReason?: string;
}

export function ReadinessScoreCard({
  score,
  scoreColorClass,
  findingCountLabel,
  auditsSkipped,
  auditStatusLabel,
  figmaSkippedReason,
}: ReadinessScoreCardProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div>
        <p className="text-sm font-medium text-zinc-500">Readiness Score</p>
        <p
          className={`text-5xl font-semibold tabular-nums ${scoreColorClass}`}
        >
          {score}
        </p>
      </div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <p>{findingCountLabel}</p>
        {auditsSkipped ? (
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            {figmaSkippedReason ??
              "Audits not run — set FIGMA_ACCESS_TOKEN to scan the file."}
          </p>
        ) : (
          auditStatusLabel && (
            <p className="mt-1 text-zinc-500 dark:text-zinc-500">
              {auditStatusLabel}
            </p>
          )
        )}
      </div>
    </div>
  );
}
