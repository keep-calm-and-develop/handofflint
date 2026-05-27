"use client";

import { useCallback, useMemo, useState } from "react";

import { parseFigmaUrl, type ParsedFigmaUrl } from "@/lib/figma/url";

export interface UseFigmaUrlReturn {
  url: string;
  setUrl: (value: string) => void;
  trimmedUrl: string;
  canSubmit: boolean;
  validationHint: string | null;
  parsed: ParsedFigmaUrl | null;
}

export function useFigmaUrl(initialUrl = ""): UseFigmaUrlReturn {
  const [url, setUrl] = useState(initialUrl);

  const trimmedUrl = url.trim();

  const { canSubmit, validationHint, parsed } = useMemo(() => {
    if (!trimmedUrl) {
      return { canSubmit: false, validationHint: null, parsed: null };
    }

    const result = parseFigmaUrl(trimmedUrl);
    if (!result.ok) {
      return {
        canSubmit: false,
        validationHint: result.error,
        parsed: null,
      };
    }

    return {
      canSubmit: true,
      validationHint: null,
      parsed: result,
    };
  }, [trimmedUrl]);

  const setUrlStable = useCallback((value: string) => setUrl(value), []);

  return {
    url,
    setUrl: setUrlStable,
    trimmedUrl,
    canSubmit,
    validationHint,
    parsed,
  };
}
