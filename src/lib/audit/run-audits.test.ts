import { describe, it, expect } from "vitest";
import { runAllAudits } from "./run-audits";
import mockFileJson from "../../../example.json"; // Your local mock payload[cite: 2]
import { computeReadinessScore } from "../readiness-score";
import { extractFigmaDocuments } from "../figma/tree";

describe("Phase 2 - Golden Snapshot & Edge Case Integration", () => {
  // 2.2: Integration check to secure your deterministic baseline
  it("should process a full mock file and return consistent findings", () => {
    // Cast your mock data to match your Figma node tree structure
    const findings = runAllAudits(extractFigmaDocuments(mockFileJson), {
      fileKey: "test",
    });
    const score = computeReadinessScore(findings);

    expect(findings.length).toBeGreaterThan(0);
    // Snapshot locks the results so future AI work won't accidentally break your baseline math!
    expect(score).toMatchSnapshot();
  });

  // 2.3: Blank/unparseable canvas edge case[cite: 1]
  it("should return zero findings and perfect score for an empty design canvas", () => {
    const emptyCanvas = {
      id: "0:0",
      name: "Document",
      type: "DOCUMENT",
      children: [],
    };
    const findings = runAllAudits([emptyCanvas], { fileKey: "test" });
    const score = computeReadinessScore(findings);

    expect(findings).toEqual([]);
    expect(score).toBe(100); // Perfect score since there are no structural elements to fail
  });
});
