import { ReActLoopPresentation } from "@/components/react-loop/ReActLoopPresentation";
import { SiteShell } from "@/components/layout/SiteShell";
import { buildReactLoopPresentationData } from "@/lib/react-loop-presentation";

export const metadata = {
  title: "ReAct Vision Loop — HandOffLint",
  description:
    "Mock replay of the agentic vision investigation loop using a captured SSE stream.",
};

export default function ReactLoopPage() {
  const data = buildReactLoopPresentationData();

  return (
    <SiteShell ctaHref="/agent" ctaLabel="Try Agent">
      <ReActLoopPresentation data={data} />
    </SiteShell>
  );
}
