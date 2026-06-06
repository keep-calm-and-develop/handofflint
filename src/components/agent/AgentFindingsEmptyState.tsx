interface AgentFindingsEmptyStateProps {
  hasAudit: boolean;
}

export function AgentFindingsEmptyState({
  hasAudit,
}: AgentFindingsEmptyStateProps) {
  if (!hasAudit) {
    return (
      <p className="text-sm text-zinc-500">
        No linter findings yet. Run step 2 to populate the matrix.
      </p>
    );
  }

  return (
    <p className="text-sm text-zinc-500">
      No naming issues under current rules (primitives inside named components,
      groups, and frames are allowed).
    </p>
  );
}
