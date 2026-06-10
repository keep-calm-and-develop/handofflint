import { SystemArchitectureFlowDiagram } from "@/components/architecture/Diagram";
import { FIGMA_COLORS } from "@/components/layout/figma-colors";
import { SiteShell } from "@/components/layout/SiteShell";
import { buildEvalsPresentationData } from "@/lib/evals/presentation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Code,
  Cpu,
  Database,
} from "lucide-react";
import Link from "next/link";

const ARCHITECTURE_DEEP_DIVES = [
  {
    href: "/react-loop",
    label: "ReAct Vision Loop",
    hint: "Multi-turn agent stream",
  },
  {
    href: "/inspect-node",
    label: "inspect_node",
    hint: "Shallow cache lookup",
  },
  {
    href: "/rag",
    label: "search_guides RAG",
    hint: "Keyword guideline retrieval",
  },
  {
    href: "/guardrails",
    label: "Cross-Modal Guardrails",
    hint: "Vision vs structure",
  },
  {
    href: "/evals",
    label: "Vision Evals",
    hint: "Golden dataset pass rates",
  },
] as const;

export default function LandingPage() {
  const evalsData = buildEvalsPresentationData();
  const lockedEvalCases = evalsData.cases.filter((item) => item.status.locked);

  return (
    <SiteShell activeNav="home">
      <section
        id="overview"
        className="scroll-mt-16 bg-white py-8 sm:py-24 border-b border-slate-200"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Fix your Figma file before AI writes the code
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            HandOffLint reviews your design for layout and structure problems
            before you hand it off to tools like Cursor, v0, or Claude. Catch
            messy frames early so the code you get back is clean, responsive,
            and ready to ship—not a pile of fixes.
          </p>

          <div className="mt-8 flex justify-center">
            <a
              href="/agent"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg text-white shadow-md hover:shadow-lg transition-all"
              style={{ backgroundColor: FIGMA_COLORS.blue }}
            >
              Try Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </div>
        </div>
      </section>

      <section
        id="problem"
        className="scroll-mt-16 py-8 sm:py-12 border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Messy designs become messy code
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              AI coding tools can only work with what they see. When a Figma
              file is disorganized, the output is hard to maintain.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6 text-sm text-slate-600 leading-relaxed">
              <p>
                Designers move fast in Figma—and that speed often leaves
                problems behind: layers stacked on top of each other, frames
                without proper containers, elements placed with fixed pixel
                positions, and half-finished layers buried in the file.
              </p>
              <p>
                When you ask an AI tool to turn that file into code, it reads
                the pixels and layer tree as-is. Without clear structure—things
                like Auto Layout, consistent spacing, and named components—it
                guesses. Often it copies exact x/y coordinates into your CSS.
              </p>
              <p>
                The result is brittle code: fixed-position divs that break on
                different screen sizes, skip accessibility basics, and ignore
                your design system. Developers then spend hours rewriting what
                should have been a straightforward handoff.
              </p>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <strong className="font-semibold block">
                    Bad input, bad output
                  </strong>
                  Skipping a design check before generation means fixing layout
                  and structure in code instead of fixing them once in Figma—
                  where it takes minutes, not days.
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-xl p-5 font-mono text-xs shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 text-slate-400">
                  <span className="flex items-center text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                    Brittle Layout Generation Output
                  </span>
                  <span>Unguided</span>
                </div>
                <pre className="overflow-x-auto text-slate-300 text-[11px] leading-relaxed">
                  {`/* absolute coordinates generated by LLM */
<div className="absolute top-[142px] left-[24px] w-[280px] h-[48px] bg-indigo-600 rounded">
  <span className="absolute top-[10px] left-[16px]">
    Submit Action
  </span>
</div>`}
                </pre>
                <div className="mt-4 border-t border-slate-800 pt-3 text-[11px] text-slate-500">
                  Without clear layout rules in the design, the AI falls back to
                  fixed coordinates—and the UI falls apart on mobile or resize.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="architecture"
        className="scroll-mt-16 py-8 bg-white sm:py-12 border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              System Architecture Flow
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              The multi-staged pipeline designed to process Figma inputs into
              structured prompt injections.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-slate-200 bg-slate-50 p-6 rounded-xl">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white mb-4"
                style={{ backgroundColor: FIGMA_COLORS.blue }}
              >
                01
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Ingestion & Server Caching
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The pipeline extracts the{" "}
                <code className="bg-slate-200 px-1 py-0.5 rounded">
                  fileKey
                </code>{" "}
                and target{" "}
                <code className="bg-slate-200 px-1 py-0.5 rounded">nodeId</code>
                . Rather than re-fetching deeply nested trees across subsequent
                requests, it flattens nodes into Upstash Redis for O(1) property
                lookup across wizard steps and serverless instances.
              </p>
            </div>

            <div className="border border-slate-200 bg-slate-50 p-6 rounded-xl">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white mb-4"
                style={{ backgroundColor: FIGMA_COLORS.purple }}
              >
                02
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Deterministic Analysis
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Executes 8 structural TypeScript audits to test spacing
                alignments, contrast calculations, and Auto Layout bounds.
                Computes a quantitative design Readiness Score scaled on layout
                density profiles.
              </p>
            </div>

            <div className="border border-slate-200 bg-slate-50 p-6 rounded-xl">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white mb-4"
                style={{ backgroundColor: FIGMA_COLORS.green }}
              >
                03
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                ReAct Vision Loop
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                A multi-step visual agent inspects the frame image. It executes
                zero-cost local tools to query cached properties and performs
                paragraph-chunk keyword RAG checks against GitHub guideline
                documents.{" "}
                <Link
                  href="/react-loop"
                  className="font-semibold hover:underline"
                  style={{ color: FIGMA_COLORS.orange }}
                >
                  Walkthrough →
                </Link>
              </p>
            </div>
          </div>

          <SystemArchitectureFlowDiagram />

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ARCHITECTURE_DEEP_DIVES.map(({ href, label, hint }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
              >
                <span className="text-xs font-bold text-slate-900 group-hover:underline">
                  {label}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  {hint}
                </span>
              </Link>
            ))}
          </div>

          {/* RAG and Tools Execution Information */}
          {/* <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-4 flex items-center">
              <Database className="w-4 h-4 mr-2 text-slate-500" />
              Agent Execution Tools (Standardized API)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed">
              <div>
                <strong className="text-slate-900 font-semibold block mb-1">
                  inspect_node_properties
                </strong>
                Looks up target node geometries from the flattened cache. Strips
                nested child arrays from response payloads to conserve model
                token consumption windows.
              </div>
              <div>
                <strong className="text-slate-900 font-semibold block mb-1">
                  search_layout_guidelines
                </strong>
                Asynchronously fetches markdown specifications via CDN. Splits
                text into paragraphs, executes alpha-numeric keyword
                intersection counts, and returns top ranked guidelines context.
              </div>
            </div>
          </div> */}
        </div>
      </section>

      <section
        id="evals"
        className="scroll-mt-16 py-8 sm:py-12 border-b border-slate-200 bg-slate-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              <BarChart3 className="w-4 h-4" style={{ color: FIGMA_COLORS.green }} />
              Offline measurement
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Vision Agent Evaluations
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              A proof-of-concept golden dataset — three mobile-app frames — measures
              how reliably the ReAct vision agent finds cross-modal defects today.
              Runs are captured once, human-reviewed, then replayed offline in CI.
              This is an honesty check on model behavior, not a claim that the
              vision agent is production-ready at scale.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Golden cases
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {evalsData.cases.length}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                vaxin ×2, Bittersweet modal
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Runs per case
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {evalsData.manifest.runsPerCase}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Same frame, repeated to surface variance
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Overall pass rate
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {evalsData.overallPassRate != null
                  ? `${evalsData.overallPassRate}%`
                  : "—"}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Mixed — strong on simple frames, weaker on complex modals
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>
                Each case pairs a Figma node tree with a rendered frame image.
                The capture workflow seeds the flat index, runs the vision agent
                ten times, applies cross-modal guardrails, and commits JSON
                results under{" "}
                <code className="bg-white px-1 py-0.5 rounded text-[11px] border border-slate-200">
                  evals/results/
                </code>
                . Vitest replays those committed outputs — no live Gemini in CI.
              </p>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs leading-relaxed">
                <strong className="font-semibold block mb-2 text-amber-900">
                  What the numbers do not mean
                </strong>
                <p>
                  These evals validate the measurement pipeline and show where the
                  agent is already useful (clear typos, obvious hierarchy clashes).
                  They do <strong className="font-semibold">not</strong> mean the
                  vision model is consistent enough for unattended production use
                  across arbitrary Figma files.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed space-y-3">
                <h3 className="font-bold text-slate-900 text-sm">
                  Known limitations today
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-slate-600">
                  <li>
                    Only <strong className="font-semibold text-slate-800">3 golden cases</strong>{" "}
                    and one layout profile (mobile-app) — not representative of all
                    handoff scenarios.
                  </li>
                  <li>
                    Gemini output is <strong className="font-semibold text-slate-800">non-deterministic</strong>:
                    the Order Details Modal case reaches just 40% full-match across
                    10 runs, even when individual findings appear more often.
                  </li>
                  <li>
                    Large or layered frames are harder — the model sometimes
                    catches layout issues but misses subtle cross-modal text
                    mismatches, or vice versa.
                  </li>
                  <li>
                    Capture was constrained by API quota; failed runs are excluded
                    from pass-rate math, which can overstate stability on thin
                    successful-run samples.
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed space-y-3">
                <h3 className="font-bold text-slate-900 text-sm">
                  Improvements needed before scale
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-slate-600">
                  <li>Expand the golden set — more frames, layout profiles, and defect types.</li>
                  <li>Run consensus voting (e.g. require a finding in ≥6/10 runs) before surfacing it.</li>
                  <li>Decompose large frames into regions instead of one full-frame vision pass.</li>
                  <li>Add per-finding confidence scores and explicit “needs human review” states.</li>
                  <li>Tighten guardrails and recalibrate when the model or prompt changes.</li>
                </ul>
              </div>

              <Link
                href="/evals"
                className="inline-flex items-center text-sm font-semibold hover:underline"
                style={{ color: FIGMA_COLORS.green }}
              >
                View full eval showcase
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Locked case pass rates
                </h3>
                {lockedEvalCases.map((item) => (
                  <div
                    key={item.meta.id}
                    className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {item.meta.frameName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.meta.id}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-900">
                      {item.summary?.passRate != null
                        ? `${item.summary.passRate}%`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed px-1">
                Pass rate = share of successful runs that matched all locked
                expected findings. High scores on simple frames and lower scores
                on complex modals are both useful signals — they show where the
                agent is ready to assist and where human review is still required.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="rules"
        className="scroll-mt-16 py-8 sm:py-12 border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Deterministic Linter Rules
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              The 8 automated TypeScript rules used to inspect raw properties
              before agent execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 p-5 rounded-xl">
              <span
                className="text-xs font-bold uppercase tracking-wider block mb-1"
                style={{ color: FIGMA_COLORS.orange }}
              >
                Rule 01
              </span>
              <strong className="text-sm font-bold text-slate-900 block mb-2">
                Naming Conventions
              </strong>
              <p className="text-xs text-slate-500 leading-relaxed">
                {`Flags generic names such as "Rectangle 211". Establishes
                structured naming constraints.`}
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl">
              <span
                className="text-xs font-bold uppercase tracking-wider block mb-1"
                style={{ color: FIGMA_COLORS.purple }}
              >
                Rule 02
              </span>
              <strong className="text-sm font-bold text-slate-900 block mb-2">
                Layout Constraints
              </strong>
              <p className="text-xs text-slate-500 leading-relaxed">
                Verifies structural auto-layout configurations to substitute
                coordinate maps with box models.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl">
              <span
                className="text-xs font-bold uppercase tracking-wider block mb-1"
                style={{ color: FIGMA_COLORS.blue }}
              >
                Rule 03
              </span>
              <strong className="text-sm font-bold text-slate-900 block mb-2">
                Hidden Cruft
              </strong>
              <p className="text-xs text-slate-500 leading-relaxed">
                Strips stray, disabled draft groups so they do not bloat
                downstream LLM context payloads.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl">
              <span
                className="text-xs font-bold uppercase tracking-wider block mb-1"
                style={{ color: FIGMA_COLORS.green }}
              >
                Rule 04
              </span>
              <strong className="text-sm font-bold text-slate-900 block mb-2">
                Spacing Variables
              </strong>
              <p className="text-xs text-slate-500 leading-relaxed">
                Validates padding, margin, and alignment coordinates against 4px
                and 8px grid tolerances.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl">
              <span
                className="text-xs font-bold uppercase tracking-wider block mb-1"
                style={{ color: FIGMA_COLORS.orange }}
              >
                Rule 05
              </span>
              <strong className="text-sm font-bold text-slate-900 block mb-2">
                WCAG Contrast
              </strong>
              <p className="text-xs text-slate-500 leading-relaxed">
                Computes relative luminance of absolute visual text nodes to
                satisfy accessibility grades.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl">
              <span
                className="text-xs font-bold uppercase tracking-wider block mb-1"
                style={{ color: FIGMA_COLORS.purple }}
              >
                Rule 06
              </span>
              <strong className="text-sm font-bold text-slate-900 block mb-2">
                SVG Structure
              </strong>
              <p className="text-xs text-slate-500 leading-relaxed">
                Validates height, width, and viewport dimensions inside vector
                shapes to prevent scaling clips.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl">
              <span
                className="text-xs font-bold uppercase tracking-wider block mb-1"
                style={{ color: FIGMA_COLORS.blue }}
              >
                Rule 07
              </span>
              <strong className="text-sm font-bold text-slate-900 block mb-2">
                Assets Export
              </strong>
              <p className="text-xs text-slate-500 leading-relaxed">
                Monitors component export profiles to trigger warnings on
                missing static resources early.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl">
              <span
                className="text-xs font-bold uppercase tracking-wider block mb-1"
                style={{ color: FIGMA_COLORS.green }}
              >
                Rule 08
              </span>
              <strong className="text-sm font-bold text-slate-900 block mb-2">
                Component Reuse
              </strong>
              <p className="text-xs text-slate-500 leading-relaxed">
                Matches nodes to external instance libraries to direct AI toward
                pre-built systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="stack" className="scroll-mt-16 py-8 sm:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Project Architecture Specifications
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              The tech-stack elements compiled for this Capstone implementation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-600 text-xs sm:text-sm leading-relaxed">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="mt-1 bg-slate-100 p-1.5 rounded text-slate-700">
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Next.js App Router Framework
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Utilizes server actions and modular API router boundaries.
                    The application orchestrates processes across three logical
                    routes:{" "}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 text-[11px]">
                      /api/agent/init
                    </code>
                    ,{" "}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 text-[11px]">
                      /api/agent/audit
                    </code>
                    , and{" "}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 text-[11px]">
                      /api/agent/vision
                    </code>
                    .
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="mt-1 bg-slate-100 p-1.5 rounded text-slate-700">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Vercel AI SDK & Gemini 2.5 Flash
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Drives multi-turn visual agent tool actions via structured
                    system models. The agent uses image analysis alongside local
                    utility executions. Outputs are generated to fulfill strict
                    Zod parsing schema expectations.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="mt-1 bg-slate-100 p-1.5 rounded text-slate-700">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Redis Flat Index
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Persists flattened Figma node maps in Upstash Redis
                    (figma:flat:fileKey) so init, audit, and vision routes share
                    state across serverless invocations. Falls back to
                    in-process memory when Redis credentials are unset.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="mt-1 bg-slate-100 p-1.5 rounded text-slate-700">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Keyword Chunk-Matching RAG
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Decouples complicated database structures in favor of
                    lightweight text manipulation. Splits downloaded markdown
                    targets into paragraphs, maps overlaps against incoming user
                    requests, and supplies context lists.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
