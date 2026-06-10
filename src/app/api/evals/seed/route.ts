import { NextResponse } from "next/server";

import { EVAL_CASES, isEvalCaseId } from "@/lib/evals/cases";
import { loadGoldenNodes } from "@/lib/evals/golden";
import { indexFigmaTreeNodes } from "@/lib/figma/cache";
import { extractFigmaDocuments } from "@/lib/figma/tree";
import type { AgentErrorResponse } from "@/lib/types";

/**
 * POST /api/evals/seed
 *
 * Primes the flat node index from a committed golden fixture (no Figma API).
 * Used by the offline vision eval capture script.
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

  const caseId =
    typeof body === "object" &&
    body !== null &&
    "caseId" in body &&
    typeof (body as { caseId: unknown }).caseId === "string"
      ? (body as { caseId: string }).caseId.trim()
      : "";

  if (!isEvalCaseId(caseId)) {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Invalid or missing caseId" },
      { status: 400 },
    );
  }

  const nodes = loadGoldenNodes(caseId);
  const documents = extractFigmaDocuments(nodes);
  if (documents.length === 0) {
    return NextResponse.json<AgentErrorResponse>(
      { error: "Golden nodes.json contains no indexable documents" },
      { status: 422 },
    );
  }

  const resolvedFileKey = EVAL_CASES[caseId].fileKey;

  await indexFigmaTreeNodes(resolvedFileKey, nodes);

  return NextResponse.json({
    caseId,
    fileKey: resolvedFileKey,
    nodesIndexed: documents.length,
    success: true,
  });
}
