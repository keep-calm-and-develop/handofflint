import type { LayoutHandoffProfile } from "@/lib/types";

import { LayoutHandoffPicker } from "./LayoutHandoffPicker";

interface ScanFormProps {
  url: string;
  onUrlChange: (value: string) => void;
  layoutHandoffProfile: LayoutHandoffProfile;
  onLayoutHandoffProfileChange: (profile: LayoutHandoffProfile) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  disabled: boolean;
  hint?: string | null;
}

export function ScanForm({
  url,
  onUrlChange,
  layoutHandoffProfile,
  onLayoutHandoffProfileChange,
  onSubmit,
  loading,
  disabled,
  hint,
}: ScanFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-3">
        <label htmlFor="figma-url" className="sr-only">
          Figma URL
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="figma-url"
            type="url"
            required
            placeholder="https://www.figma.com/design/…"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            aria-invalid={hint ? true : undefined}
            aria-describedby={hint ? "figma-url-hint" : undefined}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-800"
          />
          <button
            type="submit"
            disabled={disabled}
            className="shrink-0 rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {loading ? "Scanning…" : "Scan"}
          </button>
        </div>
        {hint && (
          <p
            id="figma-url-hint"
            className="text-sm text-amber-700 dark:text-amber-400"
          >
            {hint}
          </p>
        )}
      </div>
      <LayoutHandoffPicker
        value={layoutHandoffProfile}
        onChange={onLayoutHandoffProfileChange}
        disabled={loading}
      />
    </form>
  );
}
