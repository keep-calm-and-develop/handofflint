import { DEFAULT_DESIGN_MANUAL_URL } from "@/lib/agent/constants";
import {
  validateDesignManualUrl,
  validateFigmaNodeId,
  validateFileKey,
  validateVisionImageUrl,
} from "@/lib/agent/input-guardrails";
import { parseFigmaUrl } from "@/lib/figma/url";
import { isAbsoluteHttpUrl } from "@/lib/agent/validate-url";

export type ClientValidationResult =
  | { ok: true }
  | { ok: false; reason: string; field?: string };

/** UI labels for agent form fields — used in error messages instead of API names. */
export const AGENT_FIELD_LABELS = {
  figmaUrl: "Figma URL",
  designManualUrl: "Design manual URL",
  imageUrl: "Frame screenshot URL",
  fileKey: "Figma file key",
  nodeId: "Layer ID",
  layoutProfile: "Layout profile",
} as const;

const FIELD_NAME_TO_LABEL: Record<string, string> = {
  designManualUrl: AGENT_FIELD_LABELS.designManualUrl,
  imageUrl: AGENT_FIELD_LABELS.imageUrl,
  fileKey: AGENT_FIELD_LABELS.fileKey,
  nodeId: AGENT_FIELD_LABELS.nodeId,
  url: AGENT_FIELD_LABELS.figmaUrl,
};

/** Turn server or guardrail messages into user-facing copy with field labels. */
export function humanizeAgentError(message: string): string {
  let result = message.trim();

  for (const [field, label] of Object.entries(FIELD_NAME_TO_LABEL)) {
    result = result.replace(new RegExp(`\\b${field}\\b`, "g"), label);
  }

  const replacements: [RegExp, string][] = [
    [/^Missing Figma file key$/i, `${AGENT_FIELD_LABELS.fileKey} is required`],
    [/^Missing layer ID$/i, `${AGENT_FIELD_LABELS.nodeId} is required`],
    [/^Missing Figma URL$/i, `${AGENT_FIELD_LABELS.figmaUrl} is required`],
    [
      /^Invalid Figma file key format$/i,
      `${AGENT_FIELD_LABELS.fileKey} has an invalid format`,
    ],
    [
      /^Invalid layer ID format$/i,
      `${AGENT_FIELD_LABELS.nodeId} has an invalid format`,
    ],
    [
      /must not target internal or private hosts/i,
      "cannot point to your computer or a private network address",
    ],
    [
      /must point to a \.md or \.markdown file/i,
      "must link to a .md or .markdown file",
    ],
    [/must be a Figma CDN URL/i, "must be a Figma render link from the Images API"],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

function fail(
  reason: string,
  field?: keyof typeof AGENT_FIELD_LABELS,
): ClientValidationResult {
  return { ok: false, reason: humanizeAgentError(reason), field };
}

export function validateAgentInitInput(figmaUrl: string): ClientValidationResult {
  const trimmed = figmaUrl.trim();
  if (!trimmed) {
    return fail("Missing Figma URL", "figmaUrl");
  }

  const parsed = parseFigmaUrl(trimmed);
  if (!parsed.ok) {
    return fail(parsed.error, "figmaUrl");
  }

  return { ok: true };
}

export function validateAgentAuditInput(fileKey: string): ClientValidationResult {
  const check = validateFileKey(fileKey);
  if (!check.ok) {
    return fail(check.reason, "fileKey");
  }
  return { ok: true };
}

export interface AgentVisionInput {
  fileKey: string;
  nodeId: string;
  imageUrl: string;
  designManualUrl: string;
}

export function validateAgentVisionInput(
  input: AgentVisionInput,
): ClientValidationResult {
  const fileKeyCheck = validateFileKey(input.fileKey);
  if (!fileKeyCheck.ok) {
    return fail(fileKeyCheck.reason, "fileKey");
  }

  const nodeIdCheck = validateFigmaNodeId(input.nodeId);
  if (!nodeIdCheck.ok) {
    return fail(nodeIdCheck.reason, "nodeId");
  }

  const manualUrl = input.designManualUrl.trim() || DEFAULT_DESIGN_MANUAL_URL;
  if (!isAbsoluteHttpUrl(manualUrl)) {
    return fail(
      "Design manual URL must be a valid http(s) URL",
      "designManualUrl",
    );
  }

  const manualCheck = validateDesignManualUrl(manualUrl);
  if (!manualCheck.ok) {
    return fail(manualCheck.reason, "designManualUrl");
  }

  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) {
    return fail(
      "Frame screenshot URL is missing. Re-run ingestion with a Figma URL that includes a node-id.",
      "imageUrl",
    );
  }

  const imageCheck = validateVisionImageUrl(imageUrl);
  if (!imageCheck.ok) {
    return fail(imageCheck.reason, "imageUrl");
  }

  return { ok: true };
}
