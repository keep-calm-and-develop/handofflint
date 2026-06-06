import { getAuditLabel } from "@/lib/scan-display";
import type { Finding } from "@/lib/types";

import { SeverityBadge } from "@/components/scan/SeverityBadge";

interface AgentFindingRowProps {
  finding: Finding;
  highlighted?: boolean;
}

export function AgentFindingRow({
  finding,
  highlighted = false,
}: AgentFindingRowProps) {
  return (
    <tr
      className={`bg-white dark:bg-zinc-950 ${
        highlighted ? "bg-orange-50 dark:bg-orange-950/20" : ""
      }`}
    >
      <td className="px-4 py-3">
        <SeverityBadge severity={finding.severity} />
      </td>
      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
        {getAuditLabel(finding.auditTool)}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {finding.nodeName}
        <a
          href={finding.figmaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 block font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
        >
          {finding.nodeId}
        </a>
      </td>
      <td className="max-w-xs px-4 py-3 text-zinc-800 dark:text-zinc-200">
        {finding.message}
      </td>
    </tr>
  );
}
