import { useMemo } from "react";

import type { Finding } from "@/lib/types";

import { AgentFindingRow } from "./AgentFindingRow";

interface AgentFindingsTableProps {
  findings: Finding[];
  overlapNodeIds?: string[];
}

export function AgentFindingsTable({
  findings,
  overlapNodeIds = [],
}: AgentFindingsTableProps) {
  const overlapSet = useMemo(() => new Set(overlapNodeIds), [overlapNodeIds]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Layer</th>
              <th className="px-4 py-3 font-medium">Finding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {findings.map((finding) => (
              <AgentFindingRow
                key={finding.id}
                finding={finding}
                highlighted={overlapSet.has(finding.nodeId)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {findings.length > 5 && (
        <div className="rounded-b-xl border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-center text-xs text-zinc-500">
          {findings.length} findings — scroll to see all
        </div>
      )}
    </div>
  );
}
