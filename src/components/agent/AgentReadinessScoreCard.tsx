interface AgentReadinessScoreCardProps {
  score: number | null;
  scoreColorClass: string;
  findingCountLabel: string;
  auditStatusLabel: string | null;
}

export function AgentReadinessScoreCard({
  score,
  scoreColorClass,
  findingCountLabel,
  auditStatusLabel,
}: AgentReadinessScoreCardProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-zinc-500">Readiness Score</p>
        <p
          className={`text-5xl font-semibold tabular-nums ${scoreColorClass}`}
        >
          {score ?? "—"}
        </p>
      </div>
      <div className="text-sm text-zinc-600">
        <p>{findingCountLabel}</p>
        {auditStatusLabel && (
          <p className="mt-1 text-zinc-400">{auditStatusLabel}</p>
        )}
      </div>
    </div>
  );
}
