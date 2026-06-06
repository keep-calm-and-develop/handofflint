import { describe, expect, it } from "vitest";

import { computeReadinessScore } from "@/lib/readiness-score";
import type { Finding } from "@/lib/types";

function finding(
  overrides: Partial<Finding> & Pick<Finding, "severity" | "auditTool" | "rule">,
): Finding {
  return {
    id: "f1",
    nodeId: "1:1",
    nodeName: "Node",
    message: "test",
    figmaUrl: "https://figma.com",
    ...overrides,
  };
}

describe("computeReadinessScore", () => {
  it("returns 100 for no findings", () => {
    expect(computeReadinessScore([])).toBe(100);
  });

  it("applies a moderate penalty for a single high layout issue", () => {
    const score = computeReadinessScore([
      finding({
        severity: "high",
        auditTool: "layout",
        rule: "missing-auto-layout",
      }),
    ]);
    expect(score).toBe(92);
  });

  it("decays repeated spacing violations on the same node", () => {
    const spacingFindings = [
      "itemSpacing",
      "paddingLeft",
      "paddingRight",
      "paddingTop",
      "paddingBottom",
    ].map((property, index) =>
      finding({
        id: `spacing-${index}`,
        severity: "medium",
        auditTool: "spacing",
        rule: "off-grid-spacing",
        nodeId: "2:36",
        nodeName: "Quick Search Section",
        message: property,
      }),
    );

    const score = computeReadinessScore(spacingFindings);
    expect(score).toBeGreaterThan(85);
  });

  it("treats repeated contrast failures as one systemic pattern", () => {
    const contrastFindings = Array.from({ length: 6 }, (_, index) =>
      finding({
        id: `contrast-${index}`,
        severity: "high",
        auditTool: "contrast",
        rule: "insufficient-contrast",
        nodeId: `2:${31 + index}`,
        nodeName: "Search",
      }),
    );

    const score = computeReadinessScore(contrastFindings);
    expect(score).toBeGreaterThan(75);
    expect(score).toBeLessThan(95);
  });

  it("scores a mixed flawed-but-buildable audit in the workable range", () => {
    const findings: Finding[] = [
      finding({
        id: "layout-1",
        severity: "high",
        auditTool: "layout",
        rule: "missing-auto-layout",
        nodeId: "1:4",
      }),
      ...Array.from({ length: 6 }, (_, index) =>
        finding({
          id: `contrast-${index}`,
          severity: "high",
          auditTool: "contrast",
          rule: "insufficient-contrast",
          nodeId: `2:${31 + index}`,
        }),
      ),
      finding({
        id: "hidden-1",
        severity: "medium",
        auditTool: "hidden",
        rule: "hidden-top-level-layer",
        nodeId: "3:3",
      }),
      ...["itemSpacing", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom"].map(
        (property, index) =>
          finding({
            id: `spacing-${index}`,
            severity: "medium",
            auditTool: "spacing",
            rule: "off-grid-spacing",
            nodeId: "2:36",
            message: property,
          }),
      ),
      finding({
        id: "spacing-zero",
        severity: "low",
        auditTool: "spacing",
        rule: "zero-spacing",
        nodeId: "4:24",
      }),
    ];

    const score = computeReadinessScore(findings);
    expect(score).toBeGreaterThanOrEqual(55);
    expect(score).toBeLessThan(75);
  });

  it("allows a lower floor when critical findings are present", () => {
    const findings = Array.from({ length: 12 }, (_, index) =>
      finding({
        id: `critical-${index}`,
        severity: "critical",
        auditTool: "layout",
        rule: "missing-auto-layout",
        nodeId: `${index}:1`,
      }),
    );

    expect(computeReadinessScore(findings)).toBeLessThan(10);
  });
});
