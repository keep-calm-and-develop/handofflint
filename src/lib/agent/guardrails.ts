import { FigmaNode } from "../figma/node";
import { AIEnrichmentItem } from "../types";

/**
 * 4.1 Groundedness Filter (HARD GATE)
 * Verifies that the AI only complains about nodes that exist in your file.
 */
export function verifyGroundedness(
  aiEnrichments: AIEnrichmentItem[],
  flatNodeIds: Set<string>,
): AIEnrichmentItem[] {
  return aiEnrichments.filter((item) => {
    const isRealNode = flatNodeIds.has(item.nodeId);
    if (!isRealNode) {
      console.warn(
        `[Guardrail] Discarded hallucinated AI finding pointing to ghost ID: ${item.nodeId}`,
      );
    }
    return isRealNode;
  });
}

/**
 * 4.2 Cross-Modal Filtering (NOISE ELIMINATION)
 * Discards visual claims that are explicitly disproven by real structural JSON rules.
 */
export function crossModalFilter(
  verifiedEnrichments: AIEnrichmentItem[],
  figmaNodesMap: Map<string, FigmaNode>,
): AIEnrichmentItem[] {
  return verifiedEnrichments.filter((item) => {
    const realNode = figmaNodesMap.get(item.nodeId);
    if (!realNode) return false;

    // RULE 1: If Gemini claims an item is shifting layout bounds or clipping,
    // but the tree reveals it uses explicit Auto Layout rules, it is likely a vision hallucination.
    if (
      item.violationCategory === "visual_clipping" &&
      realNode.layoutMode &&
      realNode.layoutMode !== "NONE"
    ) {
      console.warn(
        `[Guardrail] Dropped clipping conflict on auto-layout container: ${item.nodeId}`,
      );
      return false;
    }

    // RULE 2: If Gemini reports an ugly line-break anomaly on a layer that is hidden or empty, drop it.
    if (
      item.violationCategory === "typography_anomaly" &&
      (realNode.visible === false || !realNode.characters?.trim())
    ) {
      return false;
    }

    return true;
  });
}
