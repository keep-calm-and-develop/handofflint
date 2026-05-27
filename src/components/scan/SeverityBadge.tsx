import { getSeverityStyle } from "@/lib/scan-display";
import type { Severity } from "@/lib/types";

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getSeverityStyle(severity)}`}
    >
      {severity}
    </span>
  );
}
