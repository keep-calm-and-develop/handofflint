"use client";

import { useCallback, type FormEvent } from "react";

import type { UseContrastLevelReturn } from "@/hooks/use-contrast-level";
import type { UseExportQualityReturn } from "@/hooks/use-export-quality";
import type { UseFigmaUrlReturn } from "@/hooks/use-figma-url";
import type { UseGridBaseReturn } from "@/hooks/use-grid-base";
import type { UseLayoutHandoffProfileReturn } from "@/hooks/use-layout-handoff-profile";
import type { UseScanReturn } from "@/hooks/use-scan";
import { DEFAULT_LAYOUT_HANDOFF_PROFILE } from "@/lib/types";

export interface UseScanFormOptions {
  figmaUrl: Pick<UseFigmaUrlReturn, "trimmedUrl" | "canSubmit">;
  layoutHandoff?: Pick<UseLayoutHandoffProfileReturn, "profile">;
  gridBase?: Pick<UseGridBaseReturn, "gridBase">;
  contrastLevel?: Pick<UseContrastLevelReturn, "contrastLevel">;
  exportQuality?: Pick<UseExportQualityReturn, "exportQuality">;
  scan: Pick<UseScanReturn, "scan" | "loading">;
}

export interface UseScanFormReturn {
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isSubmitDisabled: boolean;
}

export function useScanForm({
  figmaUrl,
  layoutHandoff,
  gridBase: gridBaseOption,
  contrastLevel: contrastLevelOption,
  exportQuality: exportQualityOption,
  scan,
}: UseScanFormOptions): UseScanFormReturn {
  const { trimmedUrl, canSubmit } = figmaUrl;
  const layoutHandoffProfile =
    layoutHandoff?.profile ?? DEFAULT_LAYOUT_HANDOFF_PROFILE;
  const gridBase = gridBaseOption?.gridBase;
  const contrastLevel = contrastLevelOption?.contrastLevel;
  const exportQuality = exportQualityOption?.exportQuality;
  const { scan: runScan, loading } = scan;

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!canSubmit || loading) return;
      void runScan(trimmedUrl, { layoutHandoffProfile, gridBase, contrastLevel, exportQuality });
    },
    [canSubmit, contrastLevel, exportQuality, gridBase, layoutHandoffProfile, loading, runScan, trimmedUrl],
  );

  return {
    handleSubmit,
    isSubmitDisabled: loading || !canSubmit,
  };
}
