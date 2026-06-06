"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_DESIGN_MANUAL_URL } from "@/lib/agent/constants";
import {
  isAbsoluteHttpUrl,
  resolveVisionImageUrl,
} from "@/lib/agent/validate-url";
import {
  consumeVisionStreamChunks,
  countAgentTurnsWithTools,
  finalizeVisionStream,
  INITIAL_VISION_ACTIVITY,
  parseSseBuffer,
  type VisionActivityState,
  type VisionStreamParseResult,
} from "@/lib/agent/vision-stream";
import type {
  AgentAuditResponse,
  AIEnrichmentItem,
  VisionLayoutProfile,
} from "@/lib/types";
import {
  AgentApiError,
  postAgentAudit,
  postAgentInit,
  postAgentVision,
} from "@/lib/api/agent";

const NETWORK_ERROR = "Network error — try again.";

export type WizardStep = 1 | 2 | 3 | 4;

export interface AgentVisionResult {
  status: "complete" | "error";
  enrichments: AIEnrichmentItem[];
  nodeIds: string[];
  stepsUsed: number;
  toolCallCount: number;
}

export interface UseAgentWizardReturn {
  wizardStep: WizardStep;
  setWizardStep: (step: WizardStep) => void;
  fileKey: string;
  nodeId: string | null;
  imageUrl: string | null;
  imageSource: "api" | "cache" | null;
  layoutProfile: VisionLayoutProfile;
  setLayoutProfile: (profile: VisionLayoutProfile) => void;
  scanData: AgentAuditResponse | null;
  visionResults: AgentVisionResult | null;
  visionActivity: VisionActivityState;
  activeNodeId: string | null;
  designManualUrl: string;
  setDesignManualUrl: (url: string) => void;
  figmaUrl: string;
  setFigmaUrl: (url: string) => void;
  initLoading: boolean;
  auditLoading: boolean;
  visionLoading: boolean;
  error: string | null;
  submitInit: () => Promise<boolean>;
  submitAudit: (layoutProfile: VisionLayoutProfile) => Promise<boolean>;
  launchVision: () => Promise<boolean>;
  overlappingNodeIds: string[];
  hasFrameImage: boolean;
}

export function useAgentWizard(): UseAgentWizardReturn {
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [figmaUrl, setFigmaUrl] = useState(
    "https://www.figma.com/design/kvT3qcauDE67CW76Kb56Qw/vaxin?node-id=1-4&t=EQm77ojxRtNwhUir-0",
  );
  const [fileKey, setFileKey] = useState("");
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<"api" | "cache" | null>(null);
  const [layoutProfile, setLayoutProfile] =
    useState<VisionLayoutProfile>("dashboard");
  const [scanData, setScanData] = useState<AgentAuditResponse | null>(null);
  const [visionResults, setVisionResults] = useState<AgentVisionResult | null>(
    null,
  );
  const [visionActivity, setVisionActivity] = useState<VisionActivityState>(
    INITIAL_VISION_ACTIVITY,
  );
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [designManualUrl, setDesignManualUrl] = useState(
    DEFAULT_DESIGN_MANUAL_URL,
  );
  const [initLoading, setInitLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const resetVisionState = useCallback(() => {
    setVisionActivity(INITIAL_VISION_ACTIVITY);
    setVisionResults(null);
    setActiveNodeId(nodeId);
  }, [nodeId]);

  const submitInit = useCallback(async () => {
    const trimmedUrl = figmaUrl.trim();
    if (!trimmedUrl) {
      setError("Missing Figma URL");
      return false;
    }

    setInitLoading(true);
    setError(null);
    setScanData(null);
    setVisionResults(null);
    setVisionActivity(INITIAL_VISION_ACTIVITY);
    setActiveNodeId(null);
    setImageUrl(null);
    setImageSource(null);

    try {
      const result = await postAgentInit(trimmedUrl);
      setFileKey(result.fileKey);
      setNodeId(result.nodeId);
      setImageUrl(result.imageUrl);
      setImageSource(result.imageSource ?? null);

      if (!result.imageUrl) {
        setError(
          "Figma frame render unavailable. Use a Figma URL with a renderable node-id.",
        );
      }

      setActiveNodeId(result.nodeId);
      setWizardStep(2);
      return true;
    } catch (err) {
      setError(err instanceof AgentApiError ? err.message : NETWORK_ERROR);
      return false;
    } finally {
      setInitLoading(false);
    }
  }, [figmaUrl]);

  const submitAudit = useCallback(
    async (profile: VisionLayoutProfile) => {
      if (!fileKey.trim()) {
        setError("Missing fileKey — run ingestion first");
        return false;
      }

      setAuditLoading(true);
      setError(null);
      setLayoutProfile(profile);

      try {
        const result = await postAgentAudit(fileKey, profile);
        setScanData(result);
        setWizardStep(3);
        setActiveNodeId(result.findings[0]?.nodeId ?? nodeId);
        return true;
      } catch (err) {
        setError(err instanceof AgentApiError ? err.message : NETWORK_ERROR);
        return false;
      } finally {
        setAuditLoading(false);
      }
    },
    [fileKey, nodeId],
  );

  const launchVision = useCallback(async () => {
    if (!fileKey.trim()) {
      setError("Missing fileKey — run ingestion first");
      return false;
    }

    if (!nodeId?.trim()) {
      setError("Missing nodeId — run ingestion first");
      return false;
    }

    const manualUrl = designManualUrl.trim() || DEFAULT_DESIGN_MANUAL_URL;
    if (!isAbsoluteHttpUrl(manualUrl)) {
      setError("Design manual URL must be an absolute http(s) link.");
      return false;
    }

    const resolvedImageUrl = resolveVisionImageUrl(imageUrl ?? "");
    if (!resolvedImageUrl) {
      setError(
        "Frame image missing. Re-run ingestion so fetchFigmaImages can render the target node.",
      );
      return false;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setVisionLoading(true);
    setError(null);
    setWizardStep(4);
    setVisionResults(null);
    resetVisionState();

    let streamState: VisionStreamParseResult = {
      activity: { ...INITIAL_VISION_ACTIVITY, phase: "connecting" },
      textBuffer: "",
    };
    let sseBuffer = "";

    const flushParsedEvents = (
      events: ReturnType<typeof parseSseBuffer>["events"],
    ) => {
      streamState = consumeVisionStreamChunks(events, streamState);
      setVisionActivity(streamState.activity);

      if (streamState.activity.nodeIds.length > 0) {
        setActiveNodeId(
          streamState.activity.nodeIds[streamState.activity.nodeIds.length - 1],
        );
      }
    };

    try {
      const response = await postAgentVision(
        {
          fileKey,
          nodeId,
          imageUrl: resolvedImageUrl,
          layoutProfile,
          designManualUrl: manualUrl,
        },
        { signal: controller.signal },
      );

      const body = response.body;
      if (!body) {
        throw new Error("Vision stream body missing");
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        if (controller.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        sseBuffer += decoder.decode(value, { stream: true });
        const parsed = parseSseBuffer(sseBuffer);
        sseBuffer = parsed.remainder;
        flushParsedEvents(parsed.events);
      }

      if (sseBuffer.trim()) {
        const parsed = parseSseBuffer(`${sseBuffer}\n`);
        flushParsedEvents(parsed.events);
      }

      streamState = finalizeVisionStream(streamState);
      setVisionActivity(streamState.activity);

      setVisionResults({
        status: "complete",
        enrichments: streamState.activity.enrichments ?? [],
        nodeIds: streamState.activity.nodeIds,
        stepsUsed: countAgentTurnsWithTools(streamState.activity.toolCalls),
        toolCallCount: streamState.activity.toolCalls.length,
      });
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return false;
      }

      const message =
        err instanceof AgentApiError ? err.message : NETWORK_ERROR;
      setError(message);
      setVisionActivity((prev) => ({
        ...prev,
        phase: "error",
        error: message,
      }));

      setVisionResults({
        status: "error",
        enrichments: streamState.activity.enrichments ?? [],
        nodeIds: streamState.activity.nodeIds,
        stepsUsed: countAgentTurnsWithTools(streamState.activity.toolCalls),
        toolCallCount: streamState.activity.toolCalls.length,
      });
      return false;
    } finally {
      setVisionLoading(false);
    }
  }, [
    designManualUrl,
    fileKey,
    imageUrl,
    layoutProfile,
    nodeId,
    resetVisionState,
  ]);

  const hasFrameImage = useMemo(
    () => resolveVisionImageUrl(imageUrl ?? "") !== null,
    [imageUrl],
  );

  const overlappingNodeIds = useMemo(() => {
    if (!scanData || !visionResults) {
      return [];
    }

    const findingNodeIds = new Set(
      scanData.findings.map((finding) => finding.nodeId),
    );
    const enrichmentNodeIds = visionResults.enrichments.map(
      (item) => item.nodeId,
    );
    const streamedNodeIds = visionResults.nodeIds;
    const visionNodeIds = new Set([...enrichmentNodeIds, ...streamedNodeIds]);

    return Array.from(visionNodeIds).filter((id) => findingNodeIds.has(id));
  }, [scanData, visionResults]);

  return {
    wizardStep,
    setWizardStep,
    fileKey,
    nodeId,
    imageUrl,
    imageSource,
    layoutProfile,
    setLayoutProfile,
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
  };
}
