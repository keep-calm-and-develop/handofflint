"use client";

import { useCallback, useState } from "react";

const DEFAULT_GRID_BASE = 4;

export interface UseGridBaseReturn {
  gridBase: number;
  setGridBase: (value: number) => void;
}

export function useGridBase(): UseGridBaseReturn {
  const [gridBase, setGridBaseState] = useState<number>(DEFAULT_GRID_BASE);

  const setGridBase = useCallback((next: number) => {
    if (Number.isFinite(next) && next >= 1 && next <= 5) {
      setGridBaseState(next);
    }
  }, []);

  return { gridBase, setGridBase };
}
