import { RagPresentation } from "@/components/rag/RagPresentation";
import { SiteShell } from "@/components/layout/SiteShell";
import { buildRagPresentationData } from "@/lib/rag-presentation";

export const metadata = {
  title: "search_guides RAG Pipeline — HandOffLint",
  description:
    "Visual walkthrough of the keyword RAG pipeline used by the search_guides agent tool.",
};

export default async function RagPage() {
  const data = await buildRagPresentationData();

  return (
    <SiteShell ctaHref="/agent" ctaLabel="Try Agent">
      <RagPresentation data={data} />
    </SiteShell>
  );
}
