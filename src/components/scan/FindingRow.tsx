import { getAuditLabel } from "@/lib/scan-display";
import type { Finding } from "@/lib/types";

import { SeverityBadge } from "./SeverityBadge";

interface FindingRowProps {
  finding: Finding;
}

export function FindingRow({ finding }: FindingRowProps) {
  return (
    <tr className="bg-white">
      <td className="px-4 py-3">
        <SeverityBadge severity={finding.severity} />
      </td>
      <td className="px-4 py-3 text-slate-700">
        {getAuditLabel(finding.auditTool)}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-slate-600">
        {finding.nodeName}
        <span className="mt-0.5 block text-slate-400">{finding.nodeId}</span>
      </td>
      <td className="max-w-xs px-4 py-3 text-slate-800">
        {finding.message}
      </td>
      <td className="px-4 py-3">
        <a
          href={finding.figmaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer font-medium text-figma-blue underline-offset-2 hover:underline"
        >
          Open
        </a>
      </td>
    </tr>
  );
}
