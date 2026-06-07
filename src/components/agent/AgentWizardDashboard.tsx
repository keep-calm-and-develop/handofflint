"use client";

import { useAgentAuditResult } from "@/hooks/use-agent-audit-result";
import { useAgentWizard } from "@/hooks/use-agent-wizard";

import { AgentFindingsEmptyState } from "./AgentFindingsEmptyState";
import { AgentFindingsTable } from "./AgentFindingsTable";
import { AgentReadinessScoreCard } from "./AgentReadinessScoreCard";
import { VisionActivityPanel } from "./VisionActivityPanel";
import { WizardStepIndicator } from "./WizardStepIndicator";

const CARD = "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm";
const CHIP =
  "rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600";
const CHIP_MONO = `${CHIP} font-mono`;
const INPUT =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-figma-blue focus:outline-none focus:ring-2 focus:ring-figma-blue/20";
const CTA =
  "cursor-pointer rounded-xl bg-figma-blue px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-figma-blue/30 transition hover:bg-[#0b87e0] disabled:cursor-not-allowed disabled:opacity-60";

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
    <div className={CARD}>
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">
        Density Context
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`${CHIP} font-medium text-zinc-800`}>
          {layoutProfile}
        </span>
        <span className={CHIP_MONO}>fileKey: {fileKey || "pending"}</span>
        <span className={CHIP_MONO}>nodeId: {nodeId ?? "pending"}</span>
        <span className={CHIP_MONO}>active: {activeNodeId ?? "idle"}</span>
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
    <div className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">
            Figma Frame Canvas
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {hasImage ? (
              <>
                Rendered via Figma Images API
                {imageSource ? ` (${imageSource})` : ""}:{" "}
                <span className="text-zinc-800" title={imageUrl ?? undefined}>
                  {truncateUrl(imageUrl!)}
                </span>
              </>
            ) : (
              <span>
                Awaiting frame render from fetchFigmaImages after ingestion.
              </span>
            )}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            hasHighlight
              ? "border-figma-orange bg-figma-orange/10 text-figma-orange"
              : "border-zinc-200 bg-zinc-50 text-zinc-400"
          }`}
        >
          {activeNodeId ? `target ${activeNodeId}` : "awaiting stream"}
        </span>
      </div>

      <div className="mt-4">
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl!}
              alt="Rendered Figma frame preview"
              className="h-80 w-full bg-white object-contain"
            />
          ) : (
            <div className="flex h-80 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-zinc-400">
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
                ? "border-figma-orange shadow-[0_0_0_1px_rgba(255,114,55,0.3),0_0_24px_rgba(255,114,55,0.25)]"
                : "border-transparent"
            }`}
          />

          {activeNodeId && (
            <div className="absolute left-4 top-4 rounded-full border border-figma-orange bg-white px-3 py-1 text-xs font-semibold text-figma-orange shadow-sm">
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
    <div className="grid h-full min-h-0 w-full grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden bg-slate-50 text-slate-900 lg:grid-cols-2 lg:grid-rows-1">
      <section className="min-h-0 h-full space-y-6 overflow-y-auto border-r border-slate-200 bg-white p-6 pb-10">
        <header className="space-y-3 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-figma-blue">
            Agent Pipeline
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Autonomous Design Review Wizard
          </h1>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-figma-green bg-figma-green/15 px-3 py-1 font-semibold text-figma-green">
              API Status: Active
            </span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-500">
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
            <div className={`${CARD} text-sm text-zinc-600`}>
              <div className="flex flex-wrap gap-2">
                <span className={`${CHIP} text-zinc-700`}>
                  layout: {scanData.layoutHandoffProfile}
                </span>
                <span className={`${CHIP} font-medium text-figma-green`}>
                  scan ready: {scanData.readinessScore}
                </span>
                <span className={`${CHIP} text-zinc-700`}>
                  overlap nodes: {overlapCount}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="min-h-0 h-full overflow-y-auto overscroll-y-contain bg-[#f0f7ff] px-6 pt-6 pb-12">
        <div className="space-y-6 pb-2">
          <WizardStepIndicator currentStep={wizardStep} />

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className={`${CARD} p-5`}>
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
                    className="text-sm font-medium text-zinc-700"
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
                    className={INPUT}
                  />
                </div>

                <button type="submit" disabled={initLoading} className={CTA}>
                  {initLoading ? "Ingesting…" : "Run Ingestion"}
                </button>
              </form>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-600">
                    Choose a layout profile for the deterministic audit.
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
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
                      className="cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-figma-blue hover:shadow-md hover:shadow-figma-blue/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <p className="text-sm font-semibold text-zinc-900">
                        {card.title}
                      </p>
                      <p className="mt-2 text-sm text-zinc-500">{card.body}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-600">
                    Launch the ReAct vision agent with the design manual below.
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Pre-filled with the GitHub fire-your-design-team markdown
                    guide.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="agent-design-manual-url"
                    className="text-sm font-medium text-zinc-700"
                  >
                    Design manual URL (RAG)
                  </label>
                  <input
                    id="agent-design-manual-url"
                    type="url"
                    value={designManualUrl}
                    onChange={(e) => setDesignManualUrl(e.target.value)}
                    className={INPUT}
                  />
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
                  {hasFrameImage ? (
                    <>
                      <p>
                        Frame image from Figma Images API
                        {imageSource ? ` (${imageSource})` : ""}:{" "}
                        <span
                          className="font-mono text-zinc-800"
                          title={imageUrl ?? undefined}
                        >
                          {truncateUrl(imageUrl!)}
                        </span>
                      </p>
                      <p className="mt-2 font-medium text-figma-green">
                        Render URL ready for the vision agent.
                      </p>
                    </>
                  ) : (
                    <p className="text-figma-orange">
                      No frame render yet. Re-run ingestion with a node-id so
                      fetchFigmaImages can return the preview URL.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={visionLoading || !hasFrameImage}
                  onClick={() => void launchVision()}
                  className={CTA}
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
                    className="text-sm font-medium text-zinc-700"
                  >
                    Design manual URL (RAG)
                  </label>
                  <input
                    id="agent-design-manual-url-stream"
                    type="url"
                    readOnly
                    value={designManualUrl}
                    className={`${INPUT} bg-zinc-50 text-zinc-500 read-only:cursor-default`}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "File Key", value: fileKey || "pending" },
                    { label: "Active Node", value: activeNodeId ?? "idle" },
                    { label: "Overlap", value: `${overlapCount} nodes` },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm truncate"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                        {item.label}
                      </p>
                      <p className="mt-2 font-mono text-zinc-800">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <VisionActivityPanel
                  activity={visionActivity}
                  loading={visionLoading}
                  fileKey={fileKey}
                />

                {visionResults && (
                  <div className={`${CARD} text-sm text-zinc-600`}>
                    <div className="flex flex-wrap gap-2">
                      <span className={`${CHIP} font-medium text-figma-green`}>
                        {visionResults.status}
                      </span>
                      <span className={CHIP}>
                        turns: {visionResults.stepsUsed}
                      </span>
                      <span className={CHIP}>
                        tools: {visionResults.toolCallCount}
                      </span>
                      <span className={CHIP}>
                        findings: {visionResults.enrichments.length}
                      </span>
                      <span className={CHIP}>overlaps: {overlapCount}</span>
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
