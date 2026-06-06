import { describe, expect, it } from "vitest";

import {
  buildRateLimitMessage,
  extractFigmaRateLimitDetails,
  formatRetryAfter,
  parseRetryAfterSeconds,
} from "@/lib/figma/retry-after";

describe("retry-after", () => {
  it("parses integer seconds", () => {
    expect(parseRetryAfterSeconds("30")).toBe(30);
    expect(parseRetryAfterSeconds("231890")).toBe(231890);
  });

  it("parses HTTP-date values", () => {
    const now = Date.parse("2026-05-29T12:00:00Z");
    expect(
      parseRetryAfterSeconds("Thu, 29 May 2026 13:00:00 GMT", now),
    ).toBe(3600);
  });

  it("formats long waits in days", () => {
    expect(formatRetryAfter(231890)).toBe("3 days");
  });

  it("extracts Figma 429 response headers", () => {
    const headers = new Headers({
      "Retry-After": "120",
      "X-Figma-Plan-Tier": "pro",
      "X-Figma-Rate-Limit-Type": "low",
      "X-Figma-Upgrade-Link": "https://www.figma.com/pricing",
    });

    expect(extractFigmaRateLimitDetails(headers)).toEqual({
      retryAfterSec: 120,
      planTier: "pro",
      rateLimitType: "low",
      upgradeLink: "https://www.figma.com/pricing",
    });
  });

  it("includes low seat guidance in rate limit message", () => {
    expect(
      buildRateLimitMessage(231890, { limitType: "low" }),
    ).toContain("3 days");
    expect(buildRateLimitMessage(231890, { limitType: "low" })).toContain(
      "View/Collab",
    );
  });
});
