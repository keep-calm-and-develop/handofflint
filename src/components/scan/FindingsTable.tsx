import type { Finding } from "@/lib/types";

import { FindingRow } from "./FindingRow";

interface FindingsTableProps {
  findings: Finding[];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80">
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
  );
}
