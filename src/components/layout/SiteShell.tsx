import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { FIGMA_COLORS } from "./figma-colors";
import { GitHubIcon } from "./GitHubIcon";
import Link from "next/link";

export type SiteNavId = "home" | "linear" | "agent";

const NAV_LINKS: ReadonlyArray<{
  href: string;
  label: string;
  id: SiteNavId;
}> = [{ href: "/agent", label: "Agent", id: "agent" }];

type SiteShellProps = {
  children: ReactNode;
  activeNav?: SiteNavId;
  headerExtra?: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  mainClassName?: string;
  /** Locks layout to the viewport so nested panels can scroll independently. */
  fullHeight?: boolean;
};

function FigmaColorStrip() {
  return (
    <div className="h-1.5 w-full flex">
      <div
        className="h-full flex-1"
        style={{ backgroundColor: FIGMA_COLORS.orange }}
      />
      <div
        className="h-full flex-1"
        style={{ backgroundColor: FIGMA_COLORS.purple }}
      />
      <div
        className="h-full flex-1"
        style={{ backgroundColor: FIGMA_COLORS.blue }}
      />
      <div
        className="h-full flex-1"
        style={{ backgroundColor: FIGMA_COLORS.green }}
      />
    </div>
  );
}

function BrandLogo() {
  return (
    <Link href="/" className="flex items-center space-x-4">
      <div className="flex -space-x-1" aria-label="HandOffLint logo">
        <span
          className="w-3.5 h-3.5 rounded-full block"
          style={{ backgroundColor: FIGMA_COLORS.orange }}
        />
        <span
          className="w-3.5 h-3.5 rounded-full block"
          style={{ backgroundColor: FIGMA_COLORS.purple }}
        />
        <span
          className="w-3.5 h-3.5 rounded-full block"
          style={{ backgroundColor: FIGMA_COLORS.blue }}
        />
        <span
          className="w-3.5 h-3.5 rounded-full block"
          style={{ backgroundColor: FIGMA_COLORS.green }}
        />
      </div>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        HandOff<span className="text-slate-500 font-normal">Lint</span>
      </span>
    </Link>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex -space-x-1">
                <span
                  className="w-2.5 h-2.5 rounded-full block"
                  style={{ backgroundColor: FIGMA_COLORS.orange }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full block"
                  style={{ backgroundColor: FIGMA_COLORS.purple }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full block"
                  style={{ backgroundColor: FIGMA_COLORS.blue }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full block"
                  style={{ backgroundColor: FIGMA_COLORS.green }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-900">
                HandOff<span className="text-slate-500 font-normal">Lint</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pre-flight audits for structured design-to-code generation.
            </p>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Project
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://handofflint.vercel.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Website
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/keep-calm-and-develop/handofflint"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Source Code
                </a>
              </li>
              <li>
                <Link
                  href="/#architecture"
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Architecture
                </Link>
              </li>
              <li>
                <Link
                  href="/agent"
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Agent Wizard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Architecture Deep Dives
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/react-loop"
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  ReAct Vision Loop
                </Link>
              </li>
              <li>
                <Link
                  href="/inspect-node"
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  inspect_node Tool
                </Link>
              </li>
              <li>
                <Link
                  href="/rag"
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  search_guides RAG
                </Link>
              </li>
              <li>
                <Link
                  href="/guardrails"
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cross-Modal Guardrails
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Built With
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Next.js, Tailwind CSS, Vercel AI SDK, and Gemini 2.5 Flash.
              Capstone Project 2026.
            </p>
            <p className="mt-3 font-mono text-[10px] text-slate-400">
              v1.2.0-agentic-poc
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 text-center text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} HandOffLint
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({
  children,
  activeNav,
  headerExtra,
  ctaHref = "/agent",
  ctaLabel = "Try Agent",
  mainClassName,
  fullHeight = false,
}: SiteShellProps) {
  return (
    <div
      className={`flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-figma-blue selection:text-white antialiased ${
        fullHeight
          ? "h-dvh overflow-hidden"
          : "min-h-screen"
      }`}
    >
      <FigmaColorStrip />

      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4 min-w-0">
            <BrandLogo />
            <nav
              aria-label="Primary"
              className="hidden sm:flex items-center space-x-1"
            >
              {NAV_LINKS.map(({ href, label, id }) => {
                const isActive = activeNav === id;
                return (
                  <a
                    key={href}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </a>
                );
              })}
            </nav>
            {headerExtra}
          </div>

          <div className="flex items-center space-x-4 shrink-0">
            <a
              href="https://github.com/keep-calm-and-develop/handofflint"
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
              title="GitHub Repository"
              aria-label="GitHub Repository"
            >
              <GitHubIcon className="w-5 h-5" />
            </a>
            <a
              href={ctaHref}
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg text-white transition-all shadow-sm hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: FIGMA_COLORS.blue }}
            >
              {ctaLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </div>
        </div>
      </header>

      <main
        className={
          mainClassName ??
          (fullHeight ? "flex-1 min-h-0 overflow-hidden" : "flex-1")
        }
      >
        {children}
      </main>

      {!fullHeight && <SiteFooter />}
    </div>
  );
}
