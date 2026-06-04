import type { ExportQuality } from "@/lib/types";
import {
  EXPORT_QUALITY_OPTIONS,
  getExportQualityLabel,
} from "@/lib/scan-display";

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
      <legend className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Image export sharpness
      </legend>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        PNG and JPG exports without enough scale look blurry on modern screens.
        Pick the minimum quality your project requires.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {EXPORT_QUALITY_OPTIONS.map((option) => {
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
                name="export-quality"
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
            {getExportQualityLabel(value)}:
          </span>{" "}
          {activeHint}
        </p>
      )}
    </fieldset>
  );
}
