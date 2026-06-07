import {
  crossModalFilter,
  verifyGroundedness,
} from "@/lib/agent/guardrails";
import {
  getExampleFigmaFixtureMeta,
  getExampleNode,
  getExampleNodeIdSet,
  getExampleNodeIndexMap,
} from "@/lib/presentation-mock-data";
import type { AIEnrichmentItem } from "@/lib/types";

export type GuardrailLayer = "groundedness" | "cross_modal" | "pass";

export interface GuardrailScenario {
  id: string;
  layer: GuardrailLayer;
  title: string;
  visionClaim: string;
  structuralEvidence: string;
  outcome: "kept" | "dropped";
  dropReason?: string;
  enrichment: AIEnrichmentItem;
}

export interface GuardrailsPipelineStep {
  step: number;
  name: string;
  description: string;
  inputCount: number;
  outputCount: number;
}

export interface GuardrailsPresentationData {
  fixture: ReturnType<typeof getExampleFigmaFixtureMeta>;
  scenarios: GuardrailScenario[];
  pipeline: GuardrailsPipelineStep[];
  rawInput: AIEnrichmentItem[];
  afterGroundedness: AIEnrichmentItem[];
  finalOutput: AIEnrichmentItem[];
  appliedOn: string;
  notYetOn: string;
}

/** Fabricated + real vision findings for a deterministic guardrail walkthrough. */
const MOCK_VISION_FINDINGS: AIEnrichmentItem[] = [
  {
    nodeId: "9:99",
    violationCategory: "hierarchy_clash",
    perceptualFlawDescription:
      "A fourth primary button competes with the main CTA in the header region.",
    codegenPromptSuggestion: "Demote the extra button to an outline variant.",
  },
  {
    nodeId: "4:24",
    violationCategory: "visual_clipping",
    perceptualFlawDescription:
      "About section text is clipped at the container edge in the screenshot.",
    codegenPromptSuggestion: "Increase frame height or enable text wrapping.",
  },
  {
    nodeId: "3:3",
    violationCategory: "typography_anomaly",
    perceptualFlawDescription:
      "Menu icon label shows an awkward orphan word on the last line.",
    codegenPromptSuggestion: "Widen the text box to prevent the orphan.",
  },
  {
    nodeId: "2:3",
    violationCategory: "typography_anomaly",
    perceptualFlawDescription:
      "Body copy contains the misspelling “availibility” instead of “availability”.",
    codegenPromptSuggestion: "Correct the typo in the characters string.",
  },
  {
    nodeId: "2:28",
    violationCategory: "symmetry_break",
    perceptualFlawDescription:
      "Pincode digit boxes are packed too tightly horizontally.",
    codegenPromptSuggestion: "Increase itemSpacing to follow the 8pt grid.",
  },
];

function describeNodeEvidence(nodeId: string): string {
  const node = getExampleNode(nodeId);
  if (!node) {
    return `Node ${nodeId} does not exist in example.json — ghost citation.`;
  }

  if (node.visible === false) {
    return `Node ${nodeId} (“${node.name}”) has visible: false — hidden from the rendered frame.`;
  }

  if (node.layoutMode && node.layoutMode !== "NONE") {
    return `Node ${nodeId} (“${node.name}”) uses layoutMode: ${node.layoutMode} — auto-layout manages overflow.`;
  }

  if (node.characters?.trim()) {
    return `Node ${nodeId} has characters: “${node.characters.trim().slice(0, 48)}${node.characters.length > 48 ? "…" : ""}”.`;
  }

  return `Node ${nodeId} (“${node.name}”, type: ${node.type}) exists in the flat index.`;
}

function resolveScenario(
  enrichment: AIEnrichmentItem,
  grounded: AIEnrichmentItem[],
  final: AIEnrichmentItem[],
): GuardrailScenario {
  const inGrounded = grounded.some((item) => item.nodeId === enrichment.nodeId);
  const inFinal = final.some((item) => item.nodeId === enrichment.nodeId);

  if (!inGrounded) {
    return {
      id: enrichment.nodeId,
      layer: "groundedness",
      title: "Ghost node ID",
      visionClaim: enrichment.perceptualFlawDescription,
      structuralEvidence: describeNodeEvidence(enrichment.nodeId),
      outcome: "dropped",
      dropReason: "verifyGroundedness — nodeId not in flat index",
      enrichment,
    };
  }

  if (!inFinal) {
    const node = getExampleNode(enrichment.nodeId);
    let dropReason = "crossModalFilter — vision claim contradicted by JSON";
    let title = "Cross-modal conflict";

    if (
      enrichment.violationCategory === "visual_clipping" &&
      node?.layoutMode &&
      node.layoutMode !== "NONE"
    ) {
      title = "False clipping on auto-layout";
      dropReason = `Rule 1: visual_clipping dropped when layoutMode is ${node.layoutMode}`;
    }

    if (
      enrichment.violationCategory === "typography_anomaly" &&
      (node?.visible === false || !node?.characters?.trim())
    ) {
      title = "Typography on hidden layer";
      dropReason = "Rule 2: typography_anomaly dropped on hidden or empty text";
    }

    return {
      id: enrichment.nodeId,
      layer: "cross_modal",
      title,
      visionClaim: enrichment.perceptualFlawDescription,
      structuralEvidence: describeNodeEvidence(enrichment.nodeId),
      outcome: "dropped",
      dropReason,
      enrichment,
    };
  }

  return {
    id: enrichment.nodeId,
    layer: "pass",
    title: "Passes both gates",
    visionClaim: enrichment.perceptualFlawDescription,
    structuralEvidence: describeNodeEvidence(enrichment.nodeId),
    outcome: "kept",
    enrichment,
  };
}

export function buildGuardrailsPresentationData(): GuardrailsPresentationData {
  const fixture = getExampleFigmaFixtureMeta();
  const nodeIds = getExampleNodeIdSet();
  const nodeMap = getExampleNodeIndexMap();

  const afterGroundedness = verifyGroundedness(MOCK_VISION_FINDINGS, nodeIds);
  const finalOutput = crossModalFilter(afterGroundedness, nodeMap);

  const scenarios = MOCK_VISION_FINDINGS.map((item) =>
    resolveScenario(item, afterGroundedness, finalOutput),
  );

  return {
    fixture,
    scenarios,
    rawInput: MOCK_VISION_FINDINGS,
    afterGroundedness,
    finalOutput,
    pipeline: [
      {
        step: 1,
        name: "Vision output",
        description: "Gemini streams JSON enrichments from the screenshot.",
        inputCount: MOCK_VISION_FINDINGS.length,
        outputCount: MOCK_VISION_FINDINGS.length,
      },
      {
        step: 2,
        name: "Groundedness",
        description: "Drop findings that cite node IDs not in example.json.",
        inputCount: MOCK_VISION_FINDINGS.length,
        outputCount: afterGroundedness.length,
      },
      {
        step: 3,
        name: "Cross-modal",
        description: "Drop vision claims contradicted by structural JSON.",
        inputCount: afterGroundedness.length,
        outputCount: finalOutput.length,
      },
    ],
    appliedOn: "POST /api/scan (linear linter + vision enrichment)",
    notYetOn: "Agent wizard /api/agent/vision stream (planned)",
  };
}
