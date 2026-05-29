export type Severity = "critical" | "high" | "medium" | "low";

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
