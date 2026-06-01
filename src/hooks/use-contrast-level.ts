"use client";

import { useCallback, useState } from "react";

import {
  DEFAULT_CONTRAST_LEVEL,
  type ContrastLevel,
} from "@/lib/types";

export interface UseContrastLevelReturn {
  contrastLevel: ContrastLevel;
  setContrastLevel: (level: ContrastLevel) => void;
}

export function useContrastLevel(): UseContrastLevelReturn {
  const [contrastLevel, setContrastLevelState] = useState<ContrastLevel>(
    DEFAULT_CONTRAST_LEVEL,
  );

  const setContrastLevel = useCallback((next: ContrastLevel) => {
    setContrastLevelState(next);
  }, []);

  return { contrastLevel, setContrastLevel };
}
