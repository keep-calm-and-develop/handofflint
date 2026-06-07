import type { ExportQuality } from "@/lib/types";
import {
  EXPORT_QUALITY_OPTIONS,
  getExportQualityLabel,
} from "@/lib/scan-display";

import { SCAN_TILE_SELECTED, SCAN_TILE_UNSELECTED } from "./scan-styles";

interface ExportQualityPickerProps {
  value: ExportQuality;
  onChange: (quality: ExportQuality) => void;
  disabled?: boolean;
}

export function ExportQualityPicker({
  value,
  onChange,
  disabled = false,
}: ExportQualityPickerProps) {
  const activeHint =
    EXPORT_QUALITY_OPTIONS.find((o) => o.id === value)?.hint ?? null;

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium text-slate-900">
        Image export sharpness
      </legend>
      <p className="text-sm text-slate-600">
        PNG and JPG exports without enough scale look blurry on modern screens.
        Pick the minimum quality your project requires.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {EXPORT_QUALITY_OPTIONS.map((option) => {
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
                name="export-quality"
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
            {getExportQualityLabel(value)}:
          </span>{" "}
          {activeHint}
        </p>
      )}
    </fieldset>
  );
}
