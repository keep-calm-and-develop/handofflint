import { GuardrailsPresentation } from "@/components/guardrails/GuardrailsPresentation";
import { SiteShell } from "@/components/layout/SiteShell";
import { buildGuardrailsPresentationData } from "@/lib/guardrails-presentation";

export const metadata = {
  title: "Cross-Modal Guardrails — HandOffLint",
  description:
    "How vision findings are vetted against structural Figma JSON before reaching the user.",
};

export default function GuardrailsPage() {
  const data = buildGuardrailsPresentationData();

  return (
    <SiteShell ctaHref="/agent" ctaLabel="Try Agent">
      <GuardrailsPresentation data={data} />
    </SiteShell>
  );
}
