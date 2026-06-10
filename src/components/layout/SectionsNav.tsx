import { ChevronDown } from "lucide-react";
import Link from "next/link";

const SECTION_LINKS = [
  { href: "/#overview", label: "1. Overview" },
  { href: "/#problem", label: "2. Problem Statement" },
  { href: "/#architecture", label: "3. System Architecture" },
  { href: "/#evals", label: "4. Vision Evals" },
  { href: "/#rules", label: "5. Deterministic Linter Rules" },
  { href: "/#stack", label: "6. Technology Stack" },
] as const;

const ARCHITECTURE_DEEP_DIVE_NAV_LINKS = [
  { href: "/react-loop", label: "ReAct Vision Loop" },
  { href: "/inspect-node", label: "inspect_node Tool" },
  { href: "/rag", label: "search_guides RAG" },
  { href: "/guardrails", label: "Cross-Modal Guardrails" },
  { href: "/evals", label: "Vision Evals" },
] as const;

export function SectionsNav() {
  const [overview, problem, architecture, ...restSections] = SECTION_LINKS;

  return (
    <details className="relative group max-md:hidden">
      <summary className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span>Sections</span>
        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <nav
        aria-label="Page sections"
        className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50"
      >
        {[overview, problem, architecture].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
          >
            {label}
          </Link>
        ))}
        <div
          className="my-1 border-t border-slate-100"
          role="separator"
          aria-hidden
        />
        {ARCHITECTURE_DEEP_DIVE_NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="block pl-6 pr-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            {label}
          </Link>
        ))}
        <div
          className="my-1 border-t border-slate-100"
          role="separator"
          aria-hidden
        />
        {restSections.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
          >
            {label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
