import type { ScanResultViewModel } from "@/hooks/use-scan-result";

import { AIEnrichmentPanel } from "./AIEnrichmentPanel";
import { FindingsEmptyState } from "./FindingsEmptyState";
import { FindingsTable } from "./FindingsTable";
import { ReadinessScoreCard } from "./ReadinessScoreCard";

interface ScanResultsProps {
  viewModel: ScanResultViewModel;
}

export function ScanResults({ viewModel }: ScanResultsProps) {
  return (
    <section className="mt-10 space-y-6">
      <ReadinessScoreCard
        score={viewModel.readinessScore}
        scoreColorClass={viewModel.scoreColorClass}
        findingCountLabel={viewModel.findingCountLabel}
        auditsSkipped={viewModel.auditsSkipped}
        auditStatusLabel={viewModel.auditStatusLabel}
        figmaSkippedReason={viewModel.figmaSkippedReason}
      />

      {viewModel.aiEnrichment != null && (
        <AIEnrichmentPanel
          enrichments={viewModel.aiEnrichment}
          fileKey={viewModel.fileKey}
        />
      )}

      {viewModel.hasFindings ? (
        <FindingsTable findings={viewModel.findings} />
      ) : (
        <FindingsEmptyState
          auditsSkipped={viewModel.auditsSkipped}
          auditStatusLabel={viewModel.auditStatusLabel}
        />
      )}
    </section>
  );
}
