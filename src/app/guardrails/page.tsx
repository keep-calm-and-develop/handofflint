import { GuardrailsPresentation } from "@/components/guardrails/GuardrailsPresentation";
import { SiteShell } from "@/components/layout/SiteShell";
import { buildGuardrailsPresentationData } from "@/lib/guardrails-presentation";

export const metadata = {
  title: "Guardrails — HandOffLint",
  description:
    "How HandOffLint validates user input before the agent runs and double-checks AI findings against real Figma data.",
};

export default function GuardrailsPage() {
  const data = buildGuardrailsPresentationData();

  return (
    <SiteShell ctaHref="/agent" ctaLabel="Try Agent">
      <GuardrailsPresentation data={data} />
    </SiteShell>
  );
}
