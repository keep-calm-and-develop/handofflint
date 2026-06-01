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
        className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        Spacing grid base (px)
      </label>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
        className="w-20 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-800"
      />
    </div>
  );
}
