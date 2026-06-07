import { SiteShell } from "@/components/layout/SiteShell";
import { ScanDashboard } from "@/components/scan/ScanDashboard";
import { FileCheck2 } from "lucide-react";

export const metadata = {
  title: "HandOffLint Linear Linter",
  description:
    "Paste a Figma URL for a Readiness Score and severity-sorted lint findings before dev handoff.",
};

export default function LinearPage() {
  return (
    <SiteShell activeNav="linear" ctaHref="/agent" ctaLabel="Try Agent">
      <section className="scroll-mt-16 bg-white py-12 sm:py-16 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-6">
            <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Deterministic Design Handoff QA</span>
          </span>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Linear Linter
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Paste a Figma URL to get a Readiness Score and severity-sorted lint
            findings before marking designs ready for dev.
          </p>
        </div>
      </section>

      <ScanDashboard />
    </SiteShell>
  );
}
