import type { ScanResultViewModel } from "@/hooks/use-scan-result";

import { FindingsEmptyState } from "./FindingsEmptyState";
import { FindingsTable } from "./FindingsTable";
import { ReadinessScoreCard } from "./ReadinessScoreCard";

interface ScanResultsProps {
  viewModel: ScanResultViewModel;
}

export function ScanResults({ viewModel }: ScanResultsProps) {
  return (
    <section className="mt-10 space-y-8">
      <ReadinessScoreCard
        score={viewModel.readinessScore}
        scoreColorClass={viewModel.scoreColorClass}
        findingCountLabel={viewModel.findingCountLabel}
        isMock={viewModel.isMock}
      />
      {viewModel.hasFindings ? (
        <FindingsTable findings={viewModel.findings} />
      ) : (
        <FindingsEmptyState />
      )}
    </section>
  );
}
