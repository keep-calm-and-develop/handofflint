import { runLayoutAudit } from "@/lib/audit/layout";
import { runNamingAudit } from "@/lib/audit/naming";
import type { FigmaNode } from "@/lib/figma/node";
import type { Finding, LayoutHandoffProfile } from "@/lib/types";
import { DEFAULT_LAYOUT_HANDOFF_PROFILE } from "@/lib/types";

export interface RunAuditsOptions {
  fileKey: string;
  layoutHandoffProfile?: LayoutHandoffProfile;
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
  ];
}
