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
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-500">Readiness Score</p>
        <p
          className={`text-5xl font-semibold tabular-nums ${scoreColorClass}`}
        >
          {score}
        </p>
      </div>
      <div className="text-sm text-slate-600">
        <p>{findingCountLabel}</p>
        {auditsSkipped ? (
          <p className="mt-1 text-amber-700">
            {figmaSkippedReason ??
              "Audits not run — set FIGMA_ACCESS_TOKEN to scan the file."}
          </p>
        ) : (
          auditStatusLabel && (
            <p className="mt-1 text-slate-500">
              {auditStatusLabel}
            </p>
          )
        )}
      </div>
    </div>
  );
}
