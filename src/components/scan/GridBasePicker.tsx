import { SCAN_INPUT_COMPACT } from "./scan-styles";

interface GridBasePickerProps {
  value: number;
  onChange: (gridBase: number) => void;
  disabled?: boolean;
}

export function GridBasePicker({
  value,
  onChange,
  disabled = false,
}: GridBasePickerProps) {
  return (
    <div className="space-y-3">
      <label
        htmlFor="grid-base"
        className="text-sm font-medium text-slate-900"
      >
        Spacing grid base (px)
      </label>
      <p className="text-sm text-slate-600">
        Spacing and padding values that aren&apos;t multiples of this unit will
        be flagged.
      </p>
      <input
        id="grid-base"
        type="number"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => {
          const num = Number(e.target.value);
          if (num >= 1 && num <= 5) {
            onChange(num);
          }
        }}
        disabled={disabled}
        className={SCAN_INPUT_COMPACT}
      />
    </div>
  );
}
