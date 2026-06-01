import type { LayoutHandoffProfile } from "@/lib/types";

import {
  getLayoutHandoffLabel,
  LAYOUT_HANDOFF_OPTIONS,
} from "@/lib/scan-display";

interface LayoutHandoffPickerProps {
  value: LayoutHandoffProfile;
  onChange: (profile: LayoutHandoffProfile) => void;
  disabled?: boolean;
}

export function LayoutHandoffPicker({
  value,
  onChange,
  disabled = false,
}: LayoutHandoffPickerProps) {
  const activeHint =
    LAYOUT_HANDOFF_OPTIONS.find((option) => option.id === value)?.hint ?? null;

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        How will this design be built?
      </legend>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This adjusts how strictly we check for auto-layout — pick what matches
        your file, not your job title.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {LAYOUT_HANDOFF_OPTIONS.map((option) => {
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
                name="layout-handoff-profile"
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
            {getLayoutHandoffLabel(value)}:
          </span>{" "}
          {activeHint}
        </p>
      )}
    </fieldset>
  );
}
