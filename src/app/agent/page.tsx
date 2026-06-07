import { AgentWizardDashboard } from "@/components/agent/AgentWizardDashboard";
import { SiteShell } from "@/components/layout/SiteShell";

export const metadata = {
  title: "HandOffLint Agent",
  description: "Autonomous design review wizard for the agentic POC.",
};

export default function AgentPage() {
  return (
    <SiteShell
      activeNav="agent"
      ctaHref="/linear"
      ctaLabel="Linear Linter"
      fullHeight
    >
      <AgentWizardDashboard />
    </SiteShell>
  );
}
