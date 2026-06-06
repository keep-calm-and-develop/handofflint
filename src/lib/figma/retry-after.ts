const UNIX_TIMESTAMP_THRESHOLD = 1_000_000_000;

/** Fields returned on Figma 429 responses. @see https://developers.figma.com/docs/rest-api/rate-limits/ */
export interface FigmaRateLimitDetails {
  retryAfterSec: number;
  planTier: string | null;
  rateLimitType: string | null;
  upgradeLink: string | null;
}

export function rateLimitLogFields(
  rateLimit?: FigmaRateLimitDetails,
): Record<string, unknown> {
  if (!rateLimit) {
    return {};
  }
  return {
    retryAfterSec: rateLimit.retryAfterSec,
    planTier: rateLimit.planTier,
    rateLimitType: rateLimit.rateLimitType,
    upgradeLink: rateLimit.upgradeLink,
  };
}

/** Extract rate-limit metadata from a Figma 429 response. */
export function extractFigmaRateLimitDetails(
  headers: Headers,
  nowMs: number = Date.now(),
): FigmaRateLimitDetails {
  return {
    retryAfterSec: parseRetryAfterSeconds(headers.get("Retry-After"), nowMs),
    planTier: headers.get("X-Figma-Plan-Tier"),
    rateLimitType: headers.get("X-Figma-Rate-Limit-Type"),
    upgradeLink: headers.get("X-Figma-Upgrade-Link"),
  };
}

/** Parse Figma's Retry-After header (seconds, or HTTP-date). */
export function parseRetryAfterSeconds(
  header: string | null,
  nowMs: number = Date.now(),
): number {
  if (!header?.trim()) {
    return 60;
  }

  const trimmed = header.trim();
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    if (asNumber >= UNIX_TIMESTAMP_THRESHOLD) {
      return Math.max(1, Math.ceil(asNumber - nowMs / 1000));
    }
    return Math.ceil(asNumber);
  }

  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) {
    return Math.max(1, Math.ceil((asDate - nowMs) / 1000));
  }

  return 60;
}

export function formatRetryAfter(seconds: number): string {
  const s = Math.max(1, Math.round(seconds));

  if (s < 60) {
    return `${s} second${s === 1 ? "" : "s"}`;
  }
  if (s < 3600) {
    const minutes = Math.ceil(s / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (s < 86400) {
    const hours = Math.ceil(s / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const days = Math.ceil(s / 86400);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function buildRateLimitMessage(
  retryAfterSec: number,
  headers?: { planTier?: string | null; limitType?: string | null },
): string {
  const wait = formatRetryAfter(retryAfterSec);
  const limitType = headers?.limitType?.toLowerCase();

  if (limitType === "low") {
    return `Figma rate limit reached. Try again in ${wait}. View/Collab seats are limited to about 6 file fetches per month on many plans. A Dev or Full seat raises this limit.`;
  }

  return `Figma rate limit reached. Try again in ${wait}.`;
}
