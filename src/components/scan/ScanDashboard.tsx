"use client";

import { useFigmaUrl } from "@/hooks/use-figma-url";
import { useLayoutHandoffProfile } from "@/hooks/use-layout-handoff-profile";
import { useScan } from "@/hooks/use-scan";
import { useScanForm } from "@/hooks/use-scan-form";
import { useScanResult } from "@/hooks/use-scan-result";

import { ScanErrorAlert } from "./ScanErrorAlert";
import { ScanForm } from "./ScanForm";
import { ScanHeader } from "./ScanHeader";
import { ScanResults } from "./ScanResults";

export function ScanDashboard() {
  const figmaUrl = useFigmaUrl(
    "https://www.figma.com/design/kvT3qcauDE67CW76Kb56Qw/vaxin?node-id=2-28&t=8wS4VeFLBfj0FD4F-0",
  );
  const layoutHandoff = useLayoutHandoffProfile();
  const scan = useScan();
  const { handleSubmit, isSubmitDisabled } = useScanForm({
    figmaUrl,
    layoutHandoff,
    scan,
  });
  const resultViewModel = useScanResult(scan.result);

  const formHint =
    figmaUrl.validationHint && !scan.loading ? figmaUrl.validationHint : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <ScanHeader />
      <ScanForm
        url={figmaUrl.url}
        onUrlChange={figmaUrl.setUrl}
        layoutHandoffProfile={layoutHandoff.profile}
        onLayoutHandoffProfileChange={layoutHandoff.setProfile}
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
