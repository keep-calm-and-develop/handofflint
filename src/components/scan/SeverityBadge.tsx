import { getSeverityStyle } from "@/lib/scan-display";
import type { Severity } from "@/lib/types";

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${getSeverityStyle(severity)}`}
    >
      {severity}
    </span>
  );
}
