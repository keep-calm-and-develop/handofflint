import type { FigmaApiPayload } from "@/lib/types";

interface FigmaApiJsonProps {
  figma: FigmaApiPayload | null;
  skippedReason?: string;
}

export function FigmaApiJson({ figma, skippedReason }: FigmaApiJsonProps) {
  if (!figma) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Figma API response
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {skippedReason ?? "No Figma data returned."}
        </p>
      </div>
    );
  }

  const json = JSON.stringify(figma.data, null, 2);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Figma API response
        </h2>
        <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
          GET /v1/files/{figma.fileKey}
          {figma.endpoint === "nodes" && figma.nodeId
            ? `/nodes?ids=${figma.nodeId}`
            : "?depth=2"}
        </p>
      </div>
      <pre className="max-h-[min(480px,50vh)] overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
        {json}
      </pre>
    </div>
  );
}
