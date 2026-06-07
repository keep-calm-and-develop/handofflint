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
      <p className="text-slate-600">
        No audit results — connect Figma to run checks.
      </p>
    );
  }

  if (auditStatusLabel?.includes("could not be parsed")) {
    return (
      <p className="text-amber-700">{auditStatusLabel}</p>
    );
  }

  return (
    <p className="text-slate-600">
      No naming issues under current rules (primitives inside named components,
      groups, and frames are allowed).
    </p>
  );
}
