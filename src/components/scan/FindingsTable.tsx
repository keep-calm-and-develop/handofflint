import type { Finding } from "@/lib/types";

import { FindingRow } from "./FindingRow";

interface FindingsTableProps {
  findings: Finding[];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Layer</th>
              <th className="px-4 py-3 font-medium">Finding</th>
              <th className="px-4 py-3 font-medium">Figma</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {findings.map((finding) => (
              <FindingRow key={finding.id} finding={finding} />
            ))}
          </tbody>
        </table>
      </div>
      {findings.length > 5 && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs text-zinc-500 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-b-xl">
          {findings.length} findings — scroll to see all
        </div>
      )}
    </div>
  );
}
