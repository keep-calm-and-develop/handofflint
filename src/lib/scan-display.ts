import type { AuditTool, ContrastLevel, ExportQuality, LayoutHandoffProfile, Severity } from "@/lib/types";

export const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-figma-orange/50 bg-figma-orange/20 text-figma-orange",
  medium: "border-figma-orange/30 bg-figma-orange/10 text-[#c95520]",
  low: "border-figma-blue/30 bg-figma-blue/10 text-figma-blue",
};

export const AUDIT_LABELS: Record<AuditTool, string> = {
  layout: "Layout",
  naming: "Naming",
  hidden: "Hidden layers",
  spacing: "Spacing",
  contrast: "Contrast",
  svg: "SVG scaling",
  export: "Export settings",
  reuse: "Component reuse",
};

export function getScoreColorClass(score: number): string {
  if (score >= 85) return "text-figma-green";
  if (score >= 60) return "text-figma-orange";
  return "text-red-600";
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

export interface ExportQualityOption {
  id: ExportQuality;
  label: string;
  description: string;
  hint: string;
}

/** Plain-language image export sharpness modes shown in the scan form. */
export const EXPORT_QUALITY_OPTIONS: ExportQualityOption[] = [
  {
    id: 1,
    label: "Standard (1×)",
    description: "One pixel in the file = one screen pixel.",
    hint: "Fine for internal prototypes. Will look blurry on modern phones and laptops.",
  },
  {
    id: 2,
    label: "Retina (2×) — recommended",
    description: "Doubled pixels so images look crisp on Retina and HiDPI screens.",
    hint: "Catches PNG/JPG exports missing the @2× scale required for modern devices.",
  },
  {
    id: 3,
    label: "Ultra HD (3×)",
    description: "Triple pixels for the sharpest results on high-density phone screens.",
    hint: "Strictest — use when targeting iOS @3× devices or very high-DPI assets.",
  },
];

export function getExportQualityLabel(quality: ExportQuality): string {
  return (
    EXPORT_QUALITY_OPTIONS.find((option) => option.id === quality)?.label ??
    String(quality)
  );
}
