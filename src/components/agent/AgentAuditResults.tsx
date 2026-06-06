import type { AgentAuditResultViewModel } from "@/hooks/use-agent-audit-result";

import { AgentFindingsEmptyState } from "./AgentFindingsEmptyState";
import { AgentFindingsTable } from "./AgentFindingsTable";
import { AgentReadinessScoreCard } from "./AgentReadinessScoreCard";

interface AgentAuditResultsProps {
  viewModel: AgentAuditResultViewModel;
  overlapNodeIds?: string[];
}

export function AgentAuditResults({
  viewModel,
  overlapNodeIds = [],
}: AgentAuditResultsProps) {
  return (
    <section className="space-y-6">
      <AgentReadinessScoreCard
        score={viewModel.readinessScore}
        scoreColorClass={viewModel.scoreColorClass}
        findingCountLabel={viewModel.findingCountLabel}
        auditStatusLabel={viewModel.auditStatusLabel}
      />

      {viewModel.hasFindings ? (
        <AgentFindingsTable
          findings={viewModel.findings}
          overlapNodeIds={overlapNodeIds}
        />
      ) : (
        <AgentFindingsEmptyState hasAudit={viewModel.hasAudit} />
      )}
    </section>
  );
}
