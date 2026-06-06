import { describe, expect, it } from "vitest";

import { MOCK_IMAGE_URL } from "@/mocks/figma-handlers";

import { isAbsoluteHttpUrl, resolveVisionImageUrl } from "./validate-url";

describe("validate-url", () => {
  it("rejects relative image paths", () => {
    expect(isAbsoluteHttpUrl("/window.svg")).toBe(false);
    expect(resolveVisionImageUrl("/window.svg")).toBeNull();
  });

  it("accepts absolute http(s) URLs from the Figma images API", () => {
    expect(isAbsoluteHttpUrl(MOCK_IMAGE_URL)).toBe(true);
    expect(resolveVisionImageUrl(MOCK_IMAGE_URL)).toBe(MOCK_IMAGE_URL);
  });
});
