"use client";

import { useAgentAuditResult } from "@/hooks/use-agent-audit-result";
import { useAgentWizard } from "@/hooks/use-agent-wizard";

import { AgentFindingsEmptyState } from "./AgentFindingsEmptyState";
import { AgentFindingsTable } from "./AgentFindingsTable";
import { AgentReadinessScoreCard } from "./AgentReadinessScoreCard";
import { VisionActivityPanel } from "./VisionActivityPanel";
import { WizardStepIndicator } from "./WizardStepIndicator";

function truncateUrl(url: string, maxLength = 56): string {
  if (url.length <= maxLength) {
    return url;
  }

  return `${url.slice(0, maxLength)}…`;
}

function DensityChips({
  layoutProfile,
  fileKey,
  nodeId,
  activeNodeId,
}: {
  layoutProfile: string;
  fileKey: string;
  nodeId: string | null;
  activeNodeId: string | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
        Density Context
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200">
          {layoutProfile}
        </span>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-400">
          fileKey: {fileKey || "pending"}
        </span>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-400">
          nodeId: {nodeId ?? "pending"}
        </span>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-400">
          active: {activeNodeId ?? "idle"}
        </span>
      </div>
    </div>
  );
}

function FrameCanvas({
  imageUrl,
  imageSource,
  activeNodeId,
  targetNodeId,
}: {
  imageUrl: string | null;
  imageSource: "api" | "cache" | null;
  activeNodeId: string | null;
  targetNodeId: string | null;
}) {
  const hasHighlight = Boolean(activeNodeId);
  const hasImage = Boolean(imageUrl);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
            Figma Frame Canvas
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {hasImage ? (
              <>
                Rendered via Figma Images API
                {imageSource ? ` (${imageSource})` : ""}:{" "}
                <span className="text-zinc-200" title={imageUrl ?? undefined}>
                  {truncateUrl(imageUrl!)}
                </span>
              </>
            ) : (
              <span className="text-zinc-500">
                Awaiting frame render from fetchFigmaImages after ingestion.
              </span>
            )}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            hasHighlight
              ? "border-orange-500/40 bg-orange-500/10 text-orange-200"
              : "border-zinc-700 bg-zinc-900 text-zinc-500"
          }`}
        >
          {activeNodeId ? `target ${activeNodeId}` : "awaiting stream"}
        </span>
      </div>

      <div className="mt-4">
        <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          {hasImage ? (
            <img
              src={imageUrl!}
              alt="Rendered Figma frame preview"
              className="h-80 w-full object-contain bg-zinc-950 opacity-95"
            />
          ) : (
            <div className="flex h-80 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-zinc-500">
              <p>No frame image yet.</p>
              <p className="text-xs">
                Run step 1 with a node-id in the Figma URL to fetch a render URL
                from the mocked Figma Images API.
              </p>
            </div>
          )}

          <div
            className={`pointer-events-none absolute inset-3 rounded-xl border-2 transition ${
              hasHighlight
                ? "border-orange-400 shadow-[0_0_0_1px_rgba(251,146,60,0.25),0_0_34px_rgba(251,146,60,0.2)]"
                : "border-transparent"
            }`}
          />

          {activeNodeId && (
            <div className="absolute left-4 top-4 rounded-full border border-orange-400/40 bg-zinc-950/90 px-3 py-1 text-xs text-orange-200">
              Auditing {activeNodeId}
              {targetNodeId ? ` · target ${targetNodeId}` : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AgentWizardDashboard() {
  const {
    wizardStep,
    fileKey,
    nodeId,
    imageUrl,
    imageSource,
    layoutProfile,
    scanData,
    visionResults,
    visionActivity,
    activeNodeId,
    designManualUrl,
    setDesignManualUrl,
    figmaUrl,
    setFigmaUrl,
    initLoading,
    auditLoading,
    visionLoading,
    error,
    submitInit,
    submitAudit,
    launchVision,
    overlappingNodeIds,
    hasFrameImage,
  } = useAgentWizard();

  const overlapCount = overlappingNodeIds.length;
  const auditViewModel = useAgentAuditResult(scanData);

  return (
    <div className="grid h-screen min-h-0 w-screen grid-cols-1 overflow-hidden bg-zinc-950 text-zinc-100 lg:grid-cols-2">
      <section className="min-h-0 h-full overflow-y-auto border-r border-zinc-800 p-6 pb-10 space-y-6">
        <header className="space-y-3 border-b border-zinc-800 pb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            HandOffLint
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Autonomous Design Review Agent Pipeline
          </h1>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
              API Status: Active
            </span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">
              Token: Free Tier
            </span>
          </div>
        </header>

        <AgentReadinessScoreCard
          score={auditViewModel.readinessScore}
          scoreColorClass={auditViewModel.scoreColorClass}
          findingCountLabel={auditViewModel.findingCountLabel}
          auditStatusLabel={auditViewModel.auditStatusLabel}
        />

        <DensityChips
          layoutProfile={layoutProfile}
          fileKey={fileKey}
          nodeId={nodeId}
          activeNodeId={activeNodeId}
        />

        <FrameCanvas
          imageUrl={imageUrl}
          imageSource={imageSource}
          activeNodeId={activeNodeId}
          targetNodeId={nodeId}
        />

        <div className="space-y-3">
          {auditViewModel.hasFindings ? (
            <AgentFindingsTable
              findings={auditViewModel.findings}
              overlapNodeIds={overlappingNodeIds}
            />
          ) : (
            <AgentFindingsEmptyState hasAudit={auditViewModel.hasAudit} />
          )}

          {scanData && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200">
                  layout: {scanData.layoutHandoffProfile}
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200">
                  scan ready: {scanData.readinessScore}
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200">
                  overlap nodes: {overlapCount}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="min-h-0 h-full overflow-y-auto overscroll-y-contain bg-zinc-900/40 px-6 pt-6 pb-12">
        <div className="space-y-6 pb-2">
          <WizardStepIndicator currentStep={wizardStep} />

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
            {wizardStep === 1 && (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitInit();
                }}
              >
                <div className="space-y-2">
                  <label
                    htmlFor="agent-figma-url"
                    className="text-sm text-zinc-300"
                  >
                    Figma URL
                  </label>
                  <input
                    id="agent-figma-url"
                    type="url"
                    required
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    placeholder="https://www.figma.com/design/…"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={initLoading}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {initLoading ? "Ingesting…" : "Run Ingestion"}
                </button>
              </form>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-400">
                    Choose a layout profile for the deterministic audit.
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Current fileKey: {fileKey || "pending"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      id: "dashboard" as const,
                      title: "Dense Grid Dashboard",
                      body: "Strict hierarchy and spacing checks for data-dense dashboards.",
                    },
                    {
                      id: "landing-page" as const,
                      title: "Compact Mobile App / Spacious Landing Page",
                      body: "Looser density boundaries for marketing or mobile-first layouts.",
                    },
                  ].map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      disabled={auditLoading}
                      onClick={() => void submitAudit(card.id)}
                      className="rounded-2xl border border-zinc-700 bg-zinc-950 p-4 text-left transition hover:border-emerald-500/40 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <p className="text-sm font-medium text-white">
                        {card.title}
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">{card.body}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-400">
                    Launch the ReAct vision agent with the design manual below.
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Pre-filled with the GitHub fire-your-design-team markdown
                    guide.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="agent-design-manual-url"
                    className="text-sm text-zinc-300"
                  >
                    Design manual URL (RAG)
                  </label>
                  <input
                    id="agent-design-manual-url"
                    type="url"
                    value={designManualUrl}
                    onChange={(e) => setDesignManualUrl(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
                  {hasFrameImage ? (
                    <>
                      <p>
                        Frame image from Figma Images API
                        {imageSource ? ` (${imageSource})` : ""}:{" "}
                        <span
                          className="font-mono text-zinc-200"
                          title={imageUrl ?? undefined}
                        >
                          {truncateUrl(imageUrl!)}
                        </span>
                      </p>
                      <p className="mt-2 text-emerald-300/80">
                        Render URL ready for the vision agent.
                      </p>
                    </>
                  ) : (
                    <p className="text-amber-300/90">
                      No frame render yet. Re-run ingestion with a node-id so
                      fetchFigmaImages can return the preview URL.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={visionLoading || !hasFrameImage}
                  onClick={() => void launchVision()}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {visionLoading
                    ? "Launching Vision Agent…"
                    : "Launch Vision Agent Investigation"}
                </button>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="agent-design-manual-url-stream"
                    className="text-sm text-zinc-300"
                  >
                    Design manual URL (RAG)
                  </label>
                  <input
                    id="agent-design-manual-url-stream"
                    type="url"
                    readOnly
                    value={designManualUrl}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-400 read-only:cursor-default"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      File Key
                    </p>
                    <p className="mt-2 font-mono text-zinc-200">
                      {fileKey || "pending"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Active Node
                    </p>
                    <p className="mt-2 font-mono text-zinc-200">
                      {activeNodeId ?? "idle"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Overlap
                    </p>
                    <p className="mt-2 font-mono text-zinc-200">
                      {overlapCount} nodes
                    </p>
                  </div>
                </div>

                <VisionActivityPanel
                  activity={visionActivity}
                  loading={visionLoading}
                  fileKey={fileKey}
                />

                {visionResults && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-300">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200">
                        {visionResults.status}
                      </span>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200">
                        turns: {visionResults.stepsUsed}
                      </span>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200">
                        tools: {visionResults.toolCallCount}
                      </span>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200">
                        findings: {visionResults.enrichments.length}
                      </span>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200">
                        overlaps: {overlapCount}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
