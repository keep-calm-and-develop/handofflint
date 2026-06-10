import type { AIEnrichmentItem, VisionLayoutProfile } from "@/lib/types";

export type EvalCaseId = "vaxin-1-4" | "vaxin-20-0" | "bittersweet-9-153";

export interface EvalCaseMeta {
  id: EvalCaseId;
  label: string;
  fileKey: string;
  nodeId: string;
  frameName: string;
  layoutProfile: VisionLayoutProfile;
  figmaUrl: string;
  imagePath: string;
  nodesSource: string;
  /** Original Figma render URL when the golden PNG was captured. */
  imageSourceUrl?: string;
  order: number;
}

export interface EvalCaseStatus {
  runsCompleted: number;
  locked: boolean;
  lockedAt: string | null;
  /** Minimum full-match pass rate for locked cases (default 80). */
  minPassRate?: number;
}

export interface EvalSuiteManifest {
  version: number;
  runsPerCase: number;
  cases: EvalCaseId[];
  caseStatus: Record<EvalCaseId, EvalCaseStatus>;
}

/** Human-verified golden label for offline vision eval assertions. */
export interface ExpectedFinding {
  nodeId: string;
  violationCategory: AIEnrichmentItem["violationCategory"];
  /** Optional substring match on perceptualFlawDescription. */
  descriptionIncludes?: string;
}

export interface EvalRunRecord {
  caseId: EvalCaseId;
  runIndex: number;
  capturedAt: string;
  layoutProfile: VisionLayoutProfile;
  rawEnrichments: AIEnrichmentItem[];
  verifiedEnrichments: AIEnrichmentItem[];
  stepsUsed: number;
  toolCallCount: number;
  error: string | null;
}

export interface EvalCaseSummary {
  caseId: EvalCaseId;
  runsCompleted: number;
  runsRequired: number;
  locked: boolean;
  passRate: number | null;
  successfulRuns: number;
  lastCapturedAt: string | null;
}

export interface EvalPresentationCase {
  meta: EvalCaseMeta;
  status: EvalCaseStatus;
  expected: ExpectedFinding[];
  summary: EvalCaseSummary | null;
  recentRuns: Array<{
    runIndex: number;
    verifiedCount: number;
    capturedAt: string;
    error: string | null;
  }>;
  nodesJsonPreview: string;
  hasImage: boolean;
}

export interface EvalPresentationData {
  manifest: EvalSuiteManifest;
  cases: EvalPresentationCase[];
  overallPassRate: number | null;
  methodology: string;
}
