import { EvalsPresentation } from "@/components/evals/EvalsPresentation";
import { SiteShell } from "@/components/layout/SiteShell";
import { buildEvalsPresentationData } from "@/lib/evals/presentation";

export const metadata = {
  title: "Vision Evals — HandOffLint",
  description:
    "Golden dataset and offline pass rates for the ReAct vision agent across three mobile-app frames.",
};

export default function EvalsPage() {
  const data = buildEvalsPresentationData();

  return (
    <SiteShell ctaHref="/agent" ctaLabel="Try Agent">
      <EvalsPresentation data={data} />
    </SiteShell>
  );
}
