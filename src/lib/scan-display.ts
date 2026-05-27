import type { AuditTool, Severity } from "@/lib/types";

export const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  high: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  medium: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  low: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
};

export const AUDIT_LABELS: Record<AuditTool, string> = {
  layout: "Layout",
  naming: "Naming",
  hidden: "Hidden layers",
  spacing: "Spacing",
  contrast: "Contrast",
};

export function getScoreColorClass(score: number): string {
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function formatFindingCount(count: number): string {
  return `${count} finding${count === 1 ? "" : "s"}`;
}

export function getAuditLabel(tool: AuditTool): string {
  return AUDIT_LABELS[tool];
}

export function getSeverityStyle(severity: Severity): string {
  return SEVERITY_STYLES[severity];
}
