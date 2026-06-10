interface WizardStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
  onStepSelect?: (step: 1 | 2 | 3 | 4) => void;
  /** When true, step buttons are disabled (e.g. during API calls). */
  busy?: boolean;
}

const STEPS = [
  { id: 1, label: "Ingest" },
  { id: 2, label: "Profile" },
  { id: 3, label: "RAG" },
  { id: 4, label: "Stream" },
] as const;

export function WizardStepIndicator({
  currentStep,
  onStepSelect,
  busy = false,
}: WizardStepIndicatorProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
        Stages
      </p>
      <ol className="mt-4 grid grid-cols-4 gap-2">
        {STEPS.map((step, index) => {
          const active = currentStep >= step.id;
          const current = currentStep === step.id;
          const canSelect =
            Boolean(onStepSelect) &&
            !busy &&
            step.id <= currentStep &&
            !current;

          return (
            <li key={step.id} className="flex flex-col items-center gap-2">
              {canSelect ? (
                <button
                  type="button"
                  onClick={() => onStepSelect?.(step.id)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition hover:scale-105 ${
                    active
                      ? "border-figma-green bg-figma-green/15 text-figma-green hover:border-figma-blue hover:bg-figma-blue/10 hover:text-figma-blue"
                      : "border-zinc-200 bg-zinc-50 text-zinc-400"
                  }`}
                  title={`Go back to ${step.label}`}
                >
                  {step.id}
                </button>
              ) : (
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                    current
                      ? "border-figma-blue bg-figma-blue text-white shadow-sm shadow-figma-blue/40"
                      : active
                        ? "border-figma-green bg-figma-green/15 text-figma-green"
                        : "border-zinc-200 bg-zinc-50 text-zinc-400"
                  }`}
                >
                  {step.id}
                </div>
              )}
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${
                  current
                    ? "text-figma-blue"
                    : active
                      ? "text-figma-green"
                      : "text-zinc-400"
                }`}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className={`hidden h-0.5 w-full sm:block ${
                    currentStep > step.id
                      ? "bg-figma-green"
                      : current
                        ? "bg-figma-blue/40"
                        : "bg-zinc-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
      {onStepSelect && !busy && currentStep > 1 && (
        <p className="mt-3 text-xs text-zinc-500">
          Tap a completed stage number to go back and edit inputs.
        </p>
      )}
    </div>
  );
}
