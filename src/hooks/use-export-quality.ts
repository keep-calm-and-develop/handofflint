"use client";

import { useCallback, useState } from "react";

import {
  DEFAULT_EXPORT_QUALITY,
  EXPORT_QUALITY_VALUES,
  type ExportQuality,
} from "@/lib/types";

export interface UseExportQualityReturn {
  exportQuality: ExportQuality;
  setExportQuality: (quality: ExportQuality) => void;
}

export function useExportQuality(): UseExportQualityReturn {
  const [exportQuality, setExportQualityState] =
    useState<ExportQuality>(DEFAULT_EXPORT_QUALITY);

  const setExportQuality = useCallback((next: ExportQuality) => {
    if (EXPORT_QUALITY_VALUES.includes(next)) {
      setExportQualityState(next);
    }
  }, []);

  return { exportQuality, setExportQuality };
}
