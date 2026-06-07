import { SystemArchitectureFlowDiagram } from "@/components/architecture/Diagram";
import { FIGMA_COLORS } from "@/components/layout/figma-colors";
import { SiteShell } from "@/components/layout/SiteShell";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Code,
  Cpu,
  Database,
} from "lucide-react";

const SECTION_LINKS = [
  { href: "#overview", label: "1. Overview" },
  { href: "#problem", label: "2. Problem Statement" },
  { href: "#architecture", label: "3. System Architecture" },
  { href: "#rules", label: "4. Deterministic Linter Rules" },
  { href: "#stack", label: "5. Technology Stack" },
] as const;

function LandingSectionsNav() {
  return (
    <details className="relative group max-md:hidden">
      <summary className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span>Sections</span>
        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <nav
        aria-label="Page sections"
        className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50"
      >
        {SECTION_LINKS.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
          >
            {label}
          </a>
        ))}
      </nav>
    </details>
  );
}

export default function LandingPage() {
  return (
    <SiteShell activeNav="home" headerExtra={<LandingSectionsNav />}>
      <section
        id="overview"
        className="scroll-mt-16 bg-white py-8 sm:py-24 border-b border-slate-200"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Pre-flight audits for structured design-to-code generation.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            An engineering evaluation workspace built on a multi-turn design
            verification loop. Check schemas and layouts with zero-cost RAG
            context and deterministic rule evaluations.
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
              The Translation Bottleneck in Vibe-Coding
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              Why unguided large language models struggle to translate raw
              design schemas into maintainable code.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6 text-sm text-slate-600 leading-relaxed">
              <p>
                When visual designers arrange UI components in Figma, structural
                practices often lapse. Overlapping boundaries, missing
                containers, absolute coordinate vectors, and deep hidden draft
                layers are frequent side-effects of rapid prototyping.
              </p>
              <p>
                Frontier code generation engines (such as Cursor, v0, or Claude)
                consume either rendered layout screenshots or raw nested design
                layers. In the absence of strict layout constraints (like Auto
                Layout) or semantic class mappings, the generator translates
                coordinate markers literally.
              </p>
              <p>
                This results in fragile, absolutely positioned blocks in the
                generated CSS that require substantial developer refactoring to
                become responsive, accessible, and system-compliant.
              </p>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <strong className="font-semibold block">
                    {`The "Garbage-In, Garbage-Out" Cycle:`}
                  </strong>
                  Failing to lint underlying visual schemas prior to generation
                  forces developers to spend hours manually aligning container
                  flows that should have been deterministic from the start.
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
                  Without layout constraints, the model relies on coordinate
                  boundaries, causing breaks on fluid viewport screens.
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
                requests, it builds a flat index Map on the server for O(1)
                properties lookup.
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
                documents.
              </p>
            </div>
          </div>

          <SystemArchitectureFlowDiagram />

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
                    State Persistence Singletons
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Implements an in-memory database representation mapping tree
                    caches server-side. Keeps state lookup processes fully
                    transactional across wizard dashboard actions without
                    database dependencies.
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
