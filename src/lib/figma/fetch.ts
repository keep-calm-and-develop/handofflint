import {
  buildRateLimitMessage,
  extractFigmaRateLimitDetails,
  rateLimitLogFields,
  type FigmaRateLimitDetails,
} from "@/lib/figma/retry-after";

export class FigmaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly rateLimit?: FigmaRateLimitDetails,
  ) {
    super(message);
    this.name = "FigmaApiError";
  }
}

export function logFigmaRateLimited(
  context: string,
  details: FigmaRateLimitDetails & { url?: string },
): void {
  console.warn("[figma-rate-limit]", context, {
    ...rateLimitLogFields(details),
    ...(details.url ? { url: details.url } : {}),
  });
}

/**
 * Thin fetch wrapper that translates Figma's 429 into a typed FigmaApiError
 * with a human-readable Retry-After message. All other status codes are passed
 * through to the caller for further handling.
 */
export async function figmaFetch(url: string, token: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { "X-Figma-Token": token },
    cache: "no-store",
  });

  if (res.status === 429) {
    const rateLimit = extractFigmaRateLimitDetails(res.headers);
    logFigmaRateLimited("api_request", { url, ...rateLimit });
    throw new FigmaApiError(
      buildRateLimitMessage(rateLimit.retryAfterSec, {
        planTier: rateLimit.planTier,
        limitType: rateLimit.rateLimitType,
      }),
      429,
      rateLimit,
    );
  }

  return res;
}

/** Throws FigmaApiError for 403/404/non-ok; returns parsed JSON on success. */
export async function parseFigmaResponse(res: Response): Promise<unknown> {
  if (res.status === 403 || res.status === 404) {
    throw new FigmaApiError(
      "Cannot access file — check permissions",
      res.status,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new FigmaApiError(
      body
        ? `Figma API error (${res.status}): ${body.slice(0, 200)}`
        : `Figma API error (${res.status})`,
      res.status,
    );
  }

  return res.json();
}
