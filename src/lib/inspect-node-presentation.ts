import { toShallowInspectProperties } from "@/lib/agent/tools/inspect-node";
import type { FigmaNode } from "@/lib/figma/node";
import {
  EXAMPLE_JSON_FILE,
  getExampleFigmaFixtureMeta,
  getExampleNode,
  getExampleNodeAsRecord,
} from "@/lib/presentation-mock-data";

export interface InspectNodeExample {
  nodeId: string;
  label: string;
  whyAgentCalled: string;
  /** Full node as stored in the flat index (includes children). */
  cachedNode: Record<string, unknown>;
  shallowProperties: Record<string, unknown>;
  fullJsonChars: number;
  shallowJsonChars: number;
  childCount: number;
  highlightKeys: string[];
}

export interface InspectNodePresentationData {
  fixture: ReturnType<typeof getExampleFigmaFixtureMeta>;
  examples: InspectNodeExample[];
  indexSteps: Array<{ step: number; title: string; detail: string }>;
}

const INSPECT_DEMO_NODES: Array<{
  nodeId: string;
  label: string;
  whyAgentCalled: string;
  highlightKeys: string[];
}> = [
  {
    nodeId: "2:3",
    label: "Body copy text layer",
    whyAgentCalled:
      "Agent spotted a possible typo (“availibility”) in the screenshot and looked up exact characters + width.",
    highlightKeys: ["characters", "absoluteBoundingBox", "style"],
  },
  {
    nodeId: "2:28",
    label: "Pincode input component",
    whyAgentCalled:
      "Agent saw cramped horizontal inputs and verified the parent component bounds — without receiving child subtrees.",
    highlightKeys: ["name", "type", "absoluteBoundingBox", "children", "layoutMode"],
  },
];

function jsonSize(value: unknown): number {
  return JSON.stringify(value).length;
}

function buildExample(
  node: FigmaNode,
  displayNode: Record<string, unknown>,
  meta: (typeof INSPECT_DEMO_NODES)[number],
): InspectNodeExample {
  const shallow = toShallowInspectProperties(node);
  return {
    nodeId: node.id,
    label: meta.label,
    whyAgentCalled: meta.whyAgentCalled,
    cachedNode: displayNode,
    shallowProperties: shallow,
    fullJsonChars: jsonSize(displayNode),
    shallowJsonChars: jsonSize(shallow),
    childCount: node.children?.length ?? 0,
    highlightKeys: meta.highlightKeys,
  };
}

export function buildInspectNodePresentationData(): InspectNodePresentationData {
  const fixture = getExampleFigmaFixtureMeta();

  const examples = INSPECT_DEMO_NODES.flatMap((meta) => {
    const node = getExampleNode(meta.nodeId);
    const display = getExampleNodeAsRecord(meta.nodeId);
    if (!node || !display) {
      return [];
    }
    return [buildExample(node, display, meta)];
  });

  return {
    fixture,
    examples,
    indexSteps: [
      {
        step: 1,
        title: "Init fetches tree",
        detail: `MSW serves ${EXAMPLE_JSON_FILE} when FIGMA_API_MOCK is enabled — same payload as dev scans.`,
      },
      {
        step: 2,
        title: "Flatten into Redis",
        detail:
          "indexFigmaTreeNodes() writes figma:flat:{fileKey} to Upstash Redis (in-memory fallback in dev/tests).",
      },
      {
        step: 3,
        title: "O(1) lookup",
        detail: "inspect_node calls getIndexedNode(fileKey, nodeId) — no re-fetch, no tree walk.",
      },
      {
        step: 4,
        title: "Strip children",
        detail: "toShallowInspectProperties() removes the children array before returning to Gemini.",
      },
    ],
  };
}
