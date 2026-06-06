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
      className={`bg-white ${
        highlighted ? "bg-figma-orange/10" : ""
      }`}
    >
      <td className="px-4 py-3">
        <SeverityBadge severity={finding.severity} />
      </td>
      <td className="px-4 py-3 text-zinc-700">
        {getAuditLabel(finding.auditTool)}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-zinc-600">
        {finding.nodeName}
        <a
          href={finding.figmaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 block cursor-pointer font-medium text-figma-blue underline-offset-2 hover:underline"
        >
          {finding.nodeId}
        </a>
      </td>
      <td className="max-w-xs px-4 py-3 text-zinc-800">
        {finding.message}
      </td>
    </tr>
  );
}
