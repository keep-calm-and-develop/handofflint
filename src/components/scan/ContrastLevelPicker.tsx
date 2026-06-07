import type { ContrastLevel } from "@/lib/types";

import {
  getContrastLevelLabel,
  CONTRAST_LEVEL_OPTIONS,
} from "@/lib/scan-display";

import { SCAN_TILE_SELECTED, SCAN_TILE_UNSELECTED } from "./scan-styles";

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
      <legend className="text-sm font-medium text-slate-900">
        Contrast standard
      </legend>
      <p className="text-sm text-slate-600">
        Pick the contrast level your designs should meet — stricter levels flag
        more issues.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {CONTRAST_LEVEL_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <label
              key={option.id}
              className={`cursor-pointer rounded-xl border px-3 py-3 transition ${
                selected ? SCAN_TILE_SELECTED : SCAN_TILE_UNSELECTED
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
              <span className="block text-sm font-medium text-slate-900">
                {option.label}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                {option.description}
              </span>
            </label>
          );
        })}
      </div>
      {activeHint && (
        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-700">
            {getContrastLevelLabel(value)}:
          </span>{" "}
          {activeHint}
        </p>
      )}
    </fieldset>
  );
}
