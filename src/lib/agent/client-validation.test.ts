import { describe, expect, it } from "vitest";

import { MOCK_IMAGE_URL } from "@/mocks/figma-handlers";

import {
  AGENT_FIELD_LABELS,
  humanizeAgentError,
  validateAgentInitInput,
  validateAgentVisionInput,
} from "./client-validation";

describe("humanizeAgentError", () => {
  it("replaces API field names with UI labels", () => {
    expect(
      humanizeAgentError(
        "designManualUrl must point to a .md or .markdown file",
      ),
    ).toBe(`${AGENT_FIELD_LABELS.designManualUrl} must link to a .md or .markdown file`);
  });

  it("humanizes fileKey and nodeId messages", () => {
    expect(humanizeAgentError("Missing fileKey")).toBe(
      `${AGENT_FIELD_LABELS.fileKey} is required`,
    );
    expect(humanizeAgentError("Invalid nodeId format")).toBe(
      `${AGENT_FIELD_LABELS.nodeId} has an invalid format`,
    );
  });
});

describe("validateAgentInitInput", () => {
  it("accepts a valid Figma design URL", () => {
    expect(
      validateAgentInitInput(
        "https://www.figma.com/design/abc123/My-Design?node-id=1-4",
      ).ok,
    ).toBe(true);
  });

  it("rejects empty URL with a label-friendly message", () => {
    const result = validateAgentInitInput("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain(AGENT_FIELD_LABELS.figmaUrl);
    }
  });
});

describe("validateAgentVisionInput", () => {
  it("blocks a PDF design manual before the API is called", () => {
    const result = validateAgentVisionInput({
      fileKey: "kvT3qcauDE67CW76Kb56Qw",
      nodeId: "1:4",
      imageUrl: MOCK_IMAGE_URL,
      designManualUrl:
        "https://raw.githubusercontent.com/org/repo/main/guide.pdf",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain(AGENT_FIELD_LABELS.designManualUrl);
      expect(result.reason).not.toContain("designManualUrl");
    }
  });
});
