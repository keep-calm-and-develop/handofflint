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
