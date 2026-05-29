interface FindingsEmptyStateProps {
  auditsSkipped: boolean;
  auditStatusLabel: string | null;
}

export function FindingsEmptyState({
  auditsSkipped,
  auditStatusLabel,
}: FindingsEmptyStateProps) {
  if (auditsSkipped) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        No audit results — connect Figma to run checks.
      </p>
    );
  }

  if (auditStatusLabel?.includes("could not be parsed")) {
    return (
      <p className="text-amber-700 dark:text-amber-400">{auditStatusLabel}</p>
    );
  }

  return (
    <p className="text-zinc-600 dark:text-zinc-400">
      No naming issues under current rules (primitives inside named components,
      groups, and frames are allowed).
    </p>
  );
}
