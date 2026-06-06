interface WizardStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

const STEPS = [
  { id: 1, label: "Ingest" },
  { id: 2, label: "Profile" },
  { id: 3, label: "RAG" },
  { id: 4, label: "Stream" },
] as const;

export function WizardStepIndicator({
  currentStep,
}: WizardStepIndicatorProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
        Stages
      </p>
      <ol className="mt-4 grid grid-cols-4 gap-2">
        {STEPS.map((step, index) => {
          const active = currentStep >= step.id;
          const current = currentStep === step.id;

          return (
            <li key={step.id} className="flex flex-col items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition ${
                  current
                    ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                    : active
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-zinc-700 bg-zinc-900 text-zinc-500"
                }`}
              >
                {step.id}
              </div>
              <span
                className={`text-[10px] uppercase tracking-[0.3em] ${
                  active ? "text-zinc-200" : "text-zinc-600"
                }`}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className={`hidden h-px w-full sm:block ${
                    active ? "bg-emerald-500/50" : "bg-zinc-800"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
