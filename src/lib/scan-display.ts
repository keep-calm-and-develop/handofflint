import type { AuditTool, ContrastLevel, LayoutHandoffProfile, Severity } from "@/lib/types";

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

export interface LayoutHandoffOption {
  id: LayoutHandoffProfile;
  label: string;
  description: string;
  hint: string;
}

/** Plain-language layout check modes shown in the scan form. */
export const LAYOUT_HANDOFF_OPTIONS: LayoutHandoffOption[] = [
  {
    id: "fixed-size",
    label: "One screen size",
    description: "Built for a single device or fixed width.",
    hint: "Layout tips only — missing auto-layout is a low-priority suggestion.",
  },
  {
    id: "separate-screens",
    label: "Separate frame per device",
    description: "Mobile and desktop are different frames in the file.",
    hint: "Checks the frame you scan; inner sections get lighter warnings.",
  },
  {
    id: "flexible-layout",
    label: "One frame that resizes",
    description: "The same frame should adapt when the screen gets wider or narrower.",
    hint: "Strictest — missing auto-layout on multi-layer frames is flagged as important.",
  },
];

export function getLayoutHandoffLabel(profile: LayoutHandoffProfile): string {
  return (
    LAYOUT_HANDOFF_OPTIONS.find((option) => option.id === profile)?.label ??
    profile
  );
}

export interface ContrastLevelOption {
  id: ContrastLevel;
  label: string;
  description: string;
  hint: string;
}

/** Plain-language contrast check modes shown in the scan form. */
export const CONTRAST_LEVEL_OPTIONS: ContrastLevelOption[] = [
  {
    id: "standard",
    label: "Basic readability",
    description: "Catches only severe contrast issues (3:1 minimum).",
    hint: "Flags text that is nearly unreadable — fewer findings, lower severity.",
  },
  {
    id: "aa",
    label: "Accessible (AA)",
    description: "WCAG AA — the industry standard for web accessibility.",
    hint: "4.5:1 for body text, 3:1 for large text. Recommended for most projects.",
  },
  {
    id: "aaa",
    label: "Enhanced (AAA)",
    description: "WCAG AAA — the strictest level of contrast compliance.",
    hint: "7:1 for body text, 4.5:1 for large text. Best for high-stakes or government projects.",
  },
];

export function getContrastLevelLabel(level: ContrastLevel): string {
  return (
    CONTRAST_LEVEL_OPTIONS.find((option) => option.id === level)?.label ??
    level
  );
}
