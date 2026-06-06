"use client";

import { useState } from "react";

import type {
  ContrastLevel,
  ExportQuality,
  LayoutHandoffProfile,
} from "@/lib/types";

import { ContrastLevelPicker } from "./ContrastLevelPicker";
import { ExportQualityPicker } from "./ExportQualityPicker";
import { GridBasePicker } from "./GridBasePicker";
import { LayoutHandoffPicker } from "./LayoutHandoffPicker";

interface ScanFormProps {
  url: string;
  onUrlChange: (value: string) => void;
  layoutHandoffProfile: LayoutHandoffProfile;
  onLayoutHandoffProfileChange: (profile: LayoutHandoffProfile) => void;
  gridBase: number;
  onGridBaseChange: (gridBase: number) => void;
  contrastLevel: ContrastLevel;
  onContrastLevelChange: (level: ContrastLevel) => void;
  exportQuality: ExportQuality;
  onExportQualityChange: (quality: ExportQuality) => void;
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
  gridBase,
  onGridBaseChange,
  contrastLevel,
  onContrastLevelChange,
  exportQuality,
  onExportQualityChange,
  onSubmit,
  loading,
  disabled,
  hint,
}: ScanFormProps) {
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-figma-blue focus:outline-none focus:ring-2 focus:ring-figma-blue/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-figma-blue/20"
          />
          <button
            type="submit"
            disabled={disabled}
            className="shrink-0 cursor-pointer rounded-lg bg-figma-blue px-6 py-3 font-medium text-white transition hover:bg-figma-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setConfigOpen((prev) => !prev)}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          aria-expanded={configOpen}
        >
          <span>Scan Configuration</span>
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${configOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {configOpen && (
          <div className="space-y-5 border-t border-zinc-200 dark:border-zinc-800 px-4 py-4">
            <LayoutHandoffPicker
              value={layoutHandoffProfile}
              onChange={onLayoutHandoffProfileChange}
              disabled={loading}
            />
            <GridBasePicker
              value={gridBase}
              onChange={onGridBaseChange}
              disabled={loading}
            />
            <ContrastLevelPicker
              value={contrastLevel}
              onChange={onContrastLevelChange}
              disabled={loading}
            />
            <ExportQualityPicker
              value={exportQuality}
              onChange={onExportQualityChange}
              disabled={loading}
            />
          </div>
        )}
      </div>
    </form>
  );
}
