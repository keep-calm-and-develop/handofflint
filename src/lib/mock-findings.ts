import { buildFigmaNodeUrl } from "@/lib/figma/url";
import type { Finding } from "@/lib/types";

/** Week 1 stub findings until deterministic audit tools are wired. */
export function getMockFindings(fileKey: string): Finding[] {
  const nodes = [
    {
      nodeId: "12:34",
      nodeName: "Hero Section",
      auditTool: "layout" as const,
      severity: "high" as const,
      rule: "absolute-positioning",
      message:
        "Frame uses absolute positioning instead of Auto Layout — devs often hardcode pixel offsets in generated code.",
    },
    {
      nodeId: "56:78",
      nodeName: "Rectangle 42",
      auditTool: "naming" as const,
      severity: "medium" as const,
      rule: "default-layer-name",
      message:
        'Layer name "Rectangle 42" is not semantic — rename to describe role (e.g. "Primary CTA background").',
    },
    {
      nodeId: "90:12",
      nodeName: "deprecated-icon",
      auditTool: "hidden" as const,
      severity: "medium" as const,
      rule: "hidden-layer",
      message:
        "Hidden layer still in the handoff tree — remove or mark for export to avoid shipping dead UI.",
    },
    {
      nodeId: "34:56",
      nodeName: "Card grid",
      auditTool: "spacing" as const,
      severity: "low" as const,
      rule: "off-grid-spacing",
      message:
        "Item spacing is 13px — not on the 8px grid (expected 8, 16, or 24).",
    },
    {
      nodeId: "78:90",
      nodeName: "Caption text",
      auditTool: "contrast" as const,
      severity: "critical" as const,
      rule: "wcag-contrast-fail",
      message:
        "Text contrast ratio 3.1:1 — below WCAG AA (4.5:1) for normal text.",
    },
  ];

  return nodes.map((n, i) => ({
    id: `mock-${i + 1}`,
    ...n,
    figmaUrl: buildFigmaNodeUrl(fileKey, n.nodeId),
  }));
}
