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
  | "contrast";

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

export interface ScanResponse {
  readinessScore: number;
  findings: Finding[];
  fileKey: string;
  nodeId: string | null;
  scannedAt: string;
  figma: FigmaApiPayload | null;
  figmaSkippedReason?: string;
  /** Set when Figma data was fetched and deterministic audits ran. */
  auditSummary?: AuditSummary;
}

export interface ScanErrorResponse {
  error: string;
}
