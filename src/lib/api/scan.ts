import type { ContrastLevel, LayoutHandoffProfile, ScanErrorResponse, ScanResponse } from "@/lib/types";

export class ScanApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ScanApiError";
  }
}

export interface ScanRequestOptions {
  layoutHandoffProfile?: LayoutHandoffProfile;
  gridBase?: number;
  contrastLevel?: ContrastLevel;
}

export async function postScan(
  figmaUrl: string,
  options?: ScanRequestOptions,
): Promise<ScanResponse> {
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: figmaUrl,
      layoutHandoffProfile: options?.layoutHandoffProfile,
      gridBase: options?.gridBase,
      contrastLevel: options?.contrastLevel,
    }),
  });

  const data: ScanResponse | ScanErrorResponse = await res.json();

  if (!res.ok) {
    const message =
      "error" in data && typeof data.error === "string"
        ? data.error
        : "Scan failed";
    throw new ScanApiError(message, res.status);
  }

  return data as ScanResponse;
}
