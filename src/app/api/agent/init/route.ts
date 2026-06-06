import { NextResponse } from "next/server";

import { executeRenderFrame } from "@/lib/agent/tools/render-frame";
import { FigmaApiError, fetchFigmaTree } from "@/lib/figma/client";
import { getTreeFromCache, indexFigmaTreeNodes } from "@/lib/figma/cache";
import { parseFigmaUrl } from "@/lib/figma/url";
import type { AgentErrorResponse, AgentInitResponse } from "@/lib/types";

/**
 * POST /api/agent/init
 *
 * Wizard Step 1 — Ingestion. Accepts a raw Figma URL, parses it,
 * fetches the tree from the Figma API, and primes the server-side
 * flat-index cache for downstream agent endpoints.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const url =
    typeof body === "object" &&
    body !== null &&
    "url" in body &&
    typeof (body as { url: unknown }).url === "string"
      ? (body as { url: string }).url.trim()
      : "";

  if (!url) {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Missing Figma URL" },
      { status: 400 },
    );
  }

  const parsed = parseFigmaUrl(url);
  if (!parsed.ok) {
    return NextResponse.json<AgentErrorResponse>(
      { error: parsed.error },
      { status: 400 },
    );
  }

  try {
    const result = await fetchFigmaTree(parsed.fileKey, parsed.nodeId);

    if (!result) {
      return NextResponse.json<AgentErrorResponse>(
        { error: "FIGMA_ACCESS_TOKEN is not configured" },
        { status: 500 },
      );
    }

    indexFigmaTreeNodes(parsed.fileKey, result.data);

    const indexed = getTreeFromCache(parsed.fileKey);
    const nodesIndexed = indexed?.size ?? 0;

    if (nodesIndexed === 0) {
      return NextResponse.json<AgentErrorResponse>(
        { error: "Figma tree returned no indexable nodes" },
        { status: 422 },
      );
    }

    let imageUrl: string | null = null;
    let imageSource: "api" | "cache" | null = null;
    if (parsed.nodeId) {
      const render = await executeRenderFrame(parsed.fileKey, {
        nodeId: parsed.nodeId,
        scale: 2,
        format: "png",
      });
      if (render.status === "ok") {
        imageUrl = render.url;
        imageSource = render.source;
      }
    }

    return NextResponse.json<AgentInitResponse>({
      fileKey: parsed.fileKey,
      nodeId: parsed.nodeId,
      imageUrl,
      imageSource,
      nodesIndexed,
      success: true,
    });
  } catch (err) {
    if (err instanceof FigmaApiError) {
      return NextResponse.json<AgentErrorResponse>(
        { error: err.message },
        { status: err.status },
      );
    }
    throw err;
  }
}
