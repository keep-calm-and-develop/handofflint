import { runNamingAudit } from "@/lib/audit/naming";
import type { FigmaNode } from "@/lib/figma/node";
import type { Finding } from "@/lib/types";

export interface RunAuditsOptions {
  fileKey: string;
}

/** Runs all implemented deterministic audits against the Figma document roots. */
export function runAllAudits(
  roots: FigmaNode[],
  options: RunAuditsOptions,
): Finding[] {
  return [...runNamingAudit(roots, options)];
}
