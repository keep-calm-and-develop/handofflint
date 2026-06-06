export type Severity = "critical" | "high" | "medium" | "low";

/** User-facing layout strictness — how strictly to flag missing auto-layout. */
export type LayoutHandoffProfile =
  | "fixed-size"
  | "separate-screens"
  | "flexible-layout";

export const DEFAULT_LAYOUT_HANDOFF_PROFILE: LayoutHandoffProfile =
  "separate-screens";

export const LAYOUT_HANDOFF_PROFILES: LayoutHandoffProfile[] = [
  "fixed-size",
  "separate-screens",
  "flexible-layout",
];

export type AuditTool =
  | "layout"
  | "naming"
  | "hidden"
  | "spacing"
  | "contrast"
  | "svg"
  | "export"
  | "reuse";

/** User-facing image export sharpness — minimum scale required for PNG/JPG exports. */
export type ExportQuality = 1 | 2 | 3;

export const DEFAULT_EXPORT_QUALITY: ExportQuality = 2;

export const EXPORT_QUALITY_VALUES: ExportQuality[] = [1, 2, 3];

/** User-facing contrast strictness — how strictly to check WCAG contrast. */
export type ContrastLevel = "standard" | "aa" | "aaa";

export const DEFAULT_CONTRAST_LEVEL: ContrastLevel = "aa";

export const CONTRAST_LEVELS: ContrastLevel[] = ["standard", "aa", "aaa"];

export interface Finding {
  id: string;
  nodeId: string;
  nodeName: string;
  auditTool: AuditTool;
  severity: Severity;
  rule: string;
  message: string;
  figmaUrl: string;
}

export type FigmaApiEndpoint = "nodes" | "file";

export interface FigmaApiPayload {
  endpoint: FigmaApiEndpoint;
  fileKey: string;
  nodeId: string | null;
  data: unknown;
}

export type FigmaDataSource = "api" | "cache";

export interface FigmaFetchSummary {
  cacheHit: boolean;
  treeFetchedAt?: string;
}

export interface AuditSummary {
  nodesScanned: number;
  toolsRun: AuditTool[];
  dataSource: FigmaDataSource;
  figmaFetch?: FigmaFetchSummary;
  /** Layout audit strictness chosen for this scan. */
  layoutHandoffProfile?: LayoutHandoffProfile;
  /** True when FIGMA_API_MOCK served the tree from example.json. */
  figmaMock?: boolean;
}

export interface AIEnrichmentItem {
  nodeId: string;
  violationCategory:
    | "hierarchy_clash"
    | "typography_anomaly"
    | "visual_clipping"
    | "palette_pollution"
    | "symmetry_break";
  perceptualFlawDescription: string;
  codegenPromptSuggestion: string;
}

export interface ScanResponse {
  readinessScore: number;
  findings: Finding[];
  fileKey: string;
  nodeId: string | null;
  scannedAt: string;
  figma: FigmaApiPayload | null;
  figmaSkippedReason?: string;
  auditSummary?: AuditSummary;
  aiEnrichment?: AIEnrichmentItem[] | null;
}

export interface ScanErrorResponse {
  error: string;
}

// ── Agent Pipeline Types ─────────────────────────────────────────────

export interface AgentInitResponse {
  fileKey: string;
  nodeId: string | null;
  imageUrl: string | null;
  /** Present when `imageUrl` was produced by `fetchFigmaImages`. */
  imageSource?: "api" | "cache" | null;
  nodesIndexed: number;
  success: true;
}

export interface AgentAuditResponse {
  readinessScore: number;
  findings: Finding[];
  nodesScanned: number;
  layoutHandoffProfile: LayoutHandoffProfile;
}

export interface AgentErrorResponse {
  error: string;
}

/** Screen context profiles for the vision agent — influences investigative priorities. */
export type VisionLayoutProfile =
  | "dashboard"
  | "landing-page"
  | "mobile-app"
  | "ai-chat"
  | "e-commerce"
  | "form-heavy";

export const VISION_LAYOUT_PROFILES: VisionLayoutProfile[] = [
  "dashboard",
  "landing-page",
  "mobile-app",
  "ai-chat",
  "e-commerce",
  "form-heavy",
];

export const VISION_PROFILE_CONTEXT: Record<VisionLayoutProfile, string> = {
  dashboard:
    "This is a data-dense dashboard with charts, tables, KPI cards, and navigation sidebars. " +
    "Prioritize: information hierarchy clashes, card alignment symmetry, dense spacing issues, and data label clipping.",
  "landing-page":
    "This is a marketing landing page with hero sections, CTAs, testimonials, and feature grids. " +
    "Prioritize: CTA hierarchy (only one primary action per viewport), hero text overflow, section rhythm breaks, and accent color overuse.",
  "mobile-app":
    "This is a mobile app screen with constrained viewport width, touch targets, and bottom navigation. " +
    "Prioritize: touch target sizing (min 44px), text clipping in narrow containers, bottom nav alignment, and thumb-zone reachability.",
  "ai-chat":
    "This is a conversational AI chat interface with message bubbles, input areas, and streaming indicators. " +
    "Prioritize: message bubble alignment consistency, input area overflow, code block clipping, and typing indicator placement.",
  "e-commerce":
    "This is a product/e-commerce screen with product cards, pricing, cart elements, and category navigation. " +
    "Prioritize: price typography hierarchy, product card symmetry, image aspect ratio consistency, and CTA button competition.",
  "form-heavy":
    "This is a form-heavy interface with input fields, labels, validation states, and multi-step flows. " +
    "Prioritize: label-input alignment, error message clipping, field group spacing rhythm, and submit button hierarchy.",
};

export interface AgentVisionResponse {
  fileKey: string;
  nodeId: string;
  enrichments: AIEnrichmentItem[];
  stepsUsed: number;
  toolCalls: string[];
}
