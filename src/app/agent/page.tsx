import { AgentWizardDashboard } from "@/components/agent/AgentWizardDashboard";

export const metadata = {
  title: "HandOffLint Agent",
  description: "Autonomous design review wizard for the agentic POC.",
};

export default function AgentPage() {
  return <AgentWizardDashboard />;
}
