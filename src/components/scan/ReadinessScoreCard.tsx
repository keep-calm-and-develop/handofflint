interface ReadinessScoreCardProps {
  score: number;
  scoreColorClass: string;
  findingCountLabel: string;
  isMock: boolean;
}

export function ReadinessScoreCard({
  score,
  scoreColorClass,
  findingCountLabel,
  isMock,
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
        {isMock && (
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            Mock audit data (Week 1 stub)
          </p>
        )}
      </div>
    </div>
  );
}
