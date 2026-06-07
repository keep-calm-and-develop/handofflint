import { InspectNodePresentation } from "@/components/inspect-node/InspectNodePresentation";
import { SiteShell } from "@/components/layout/SiteShell";
import { buildInspectNodePresentationData } from "@/lib/inspect-node-presentation";

export const metadata = {
  title: "inspect_node Shallow Lookup — HandOffLint",
  description:
    "How the flat index cache and shallow property stripping protect the agent token budget.",
};

export default function InspectNodePage() {
  const data = buildInspectNodePresentationData();

  return (
    <SiteShell ctaHref="/agent" ctaLabel="Try Agent">
      <InspectNodePresentation data={data} />
    </SiteShell>
  );
}
