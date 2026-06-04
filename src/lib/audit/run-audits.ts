import { runContrastAudit } from "@/lib/audit/contrast";
import { runExportAudit } from "@/lib/audit/export";
import { runHiddenAudit } from "@/lib/audit/hidden";
import { runLayoutAudit } from "@/lib/audit/layout";
import { runNamingAudit } from "@/lib/audit/naming";
import { runReuseAudit } from "@/lib/audit/reuse";
import { runSpacingAudit } from "@/lib/audit/spacing";
import { runSvgAudit } from "@/lib/audit/svg";
import type { FigmaNode } from "@/lib/figma/node";
import type { ContrastLevel, Finding, LayoutHandoffProfile } from "@/lib/types";
import { DEFAULT_LAYOUT_HANDOFF_PROFILE } from "@/lib/types";

export interface RunAuditsOptions {
  fileKey: string;
  layoutHandoffProfile?: LayoutHandoffProfile;
  gridBase?: number;
  contrastLevel?: ContrastLevel;
  minRasterScale?: number;
}

/** Runs all implemented deterministic audits against the Figma document roots. */
export function runAllAudits(
  roots: FigmaNode[],
  options: RunAuditsOptions,
): Finding[] {
  const layoutProfile =
    options.layoutHandoffProfile ?? DEFAULT_LAYOUT_HANDOFF_PROFILE;

  return [
    ...runNamingAudit(roots, options),
    ...runLayoutAudit(roots, {
      fileKey: options.fileKey,
      layoutHandoffProfile: layoutProfile,
    }),
    ...runHiddenAudit(roots, options),
    ...runSpacingAudit(roots, {
      fileKey: options.fileKey,
      gridBase: options.gridBase,
    }),
    ...runContrastAudit(roots, {
      fileKey: options.fileKey,
      contrastLevel: options.contrastLevel,
    }),
    ...runSvgAudit(roots, { fileKey: options.fileKey }),
    ...runExportAudit(roots, {
      fileKey: options.fileKey,
      minRasterScale: options.minRasterScale,
    }),
    ...runReuseAudit(roots, { fileKey: options.fileKey }),
  ];
}
