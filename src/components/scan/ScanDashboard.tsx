"use client";

import { useFigmaUrl } from "@/hooks/use-figma-url";
import { useScan } from "@/hooks/use-scan";
import { useScanForm } from "@/hooks/use-scan-form";
import { useScanResult } from "@/hooks/use-scan-result";

import { ScanErrorAlert } from "./ScanErrorAlert";
import { ScanForm } from "./ScanForm";
import { ScanHeader } from "./ScanHeader";
import { ScanResults } from "./ScanResults";

export function ScanDashboard() {
  const figmaUrl = useFigmaUrl();
  const scan = useScan();
  const { handleSubmit, isSubmitDisabled } = useScanForm({ figmaUrl, scan });
  const resultViewModel = useScanResult(scan.result);

  const formHint =
    figmaUrl.validationHint && !scan.loading ? figmaUrl.validationHint : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <ScanHeader />
      <ScanForm
        url={figmaUrl.url}
        onUrlChange={figmaUrl.setUrl}
        onSubmit={handleSubmit}
        loading={scan.loading}
        disabled={isSubmitDisabled}
        hint={formHint}
      />
      {scan.error && <ScanErrorAlert message={scan.error} />}
      {resultViewModel && <ScanResults viewModel={resultViewModel} />}
    </div>
  );
}
