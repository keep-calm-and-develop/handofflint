"use client";

import { useCallback, useState } from "react";

import { ScanApiError, postScan } from "@/lib/api/scan";
import type { ScanResponse } from "@/lib/types";

const NETWORK_ERROR = "Network error — try again.";

export interface UseScanReturn {
  loading: boolean;
  error: string | null;
  result: ScanResponse | null;
  scan: (figmaUrl: string) => Promise<void>;
  reset: () => void;
}

export function useScan(): UseScanReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  const scan = useCallback(async (figmaUrl: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await postScan(figmaUrl);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof ScanApiError ? err.message : NETWORK_ERROR,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, result, scan, reset };
}
