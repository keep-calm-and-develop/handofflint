"use client";

import { useCallback, type FormEvent } from "react";

import type { UseFigmaUrlReturn } from "@/hooks/use-figma-url";
import type { UseScanReturn } from "@/hooks/use-scan";

export interface UseScanFormOptions {
  figmaUrl: Pick<UseFigmaUrlReturn, "trimmedUrl" | "canSubmit">;
  scan: Pick<UseScanReturn, "scan" | "loading">;
}

export interface UseScanFormReturn {
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isSubmitDisabled: boolean;
}

export function useScanForm({
  figmaUrl,
  scan,
}: UseScanFormOptions): UseScanFormReturn {
  const { trimmedUrl, canSubmit } = figmaUrl;
  const { scan: runScan, loading } = scan;

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!canSubmit || loading) return;
      void runScan(trimmedUrl);
    },
    [canSubmit, loading, runScan, trimmedUrl],
  );

  return {
    handleSubmit,
    isSubmitDisabled: loading || !canSubmit,
  };
}
