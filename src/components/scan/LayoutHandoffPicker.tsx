import type { LayoutHandoffProfile } from "@/lib/types";

import {
  getLayoutHandoffLabel,
  LAYOUT_HANDOFF_OPTIONS,
} from "@/lib/scan-display";

import { SCAN_TILE_SELECTED, SCAN_TILE_UNSELECTED } from "./scan-styles";

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
      <legend className="text-sm font-medium text-slate-900">
        How will this design be built?
      </legend>
      <p className="text-sm text-slate-600">
        This adjusts how strictly we check for auto-layout — pick what matches
        your file, not your job title.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {LAYOUT_HANDOFF_OPTIONS.map((option) => {
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
                name="layout-handoff-profile"
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
            {getLayoutHandoffLabel(value)}:
          </span>{" "}
          {activeHint}
        </p>
      )}
    </fieldset>
  );
}
