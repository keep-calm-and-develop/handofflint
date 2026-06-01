const UNIX_TIMESTAMP_THRESHOLD = 1_000_000_000;

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
