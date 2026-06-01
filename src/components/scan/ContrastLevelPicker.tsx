import type { ContrastLevel } from "@/lib/types";

import {
  getContrastLevelLabel,
  CONTRAST_LEVEL_OPTIONS,
} from "@/lib/scan-display";

interface ContrastLevelPickerProps {
  value: ContrastLevel;
  onChange: (level: ContrastLevel) => void;
  disabled?: boolean;
}

export function ContrastLevelPicker({
  value,
  onChange,
  disabled = false,
}: ContrastLevelPickerProps) {
  const activeHint =
    CONTRAST_LEVEL_OPTIONS.find((option) => option.id === value)?.hint ?? null;

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Contrast standard
      </legend>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Pick the contrast level your designs should meet — stricter levels flag
        more issues.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {CONTRAST_LEVEL_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <label
              key={option.id}
              className={`cursor-pointer rounded-lg border px-3 py-3 transition ${
                selected
                  ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-200 dark:border-zinc-100 dark:bg-zinc-900 dark:ring-zinc-700"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="contrast-level"
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
                className="sr-only"
              />
              <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {option.label}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {option.description}
              </span>
            </label>
          );
        })}
      </div>
      {activeHint && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {getContrastLevelLabel(value)}:
          </span>{" "}
          {activeHint}
        </p>
      )}
    </fieldset>
  );
}
