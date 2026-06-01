import { http, HttpResponse } from "msw";

import figmaExample from "@example.json";

const FIGMA_API = "https://api.figma.com/v1";

/** GET /files/:key?depth=2 — file tree (shallow document). */
function toFileTreeResponse(): Record<string, unknown> {
  const { nodes, ...meta } = figmaExample as Record<string, unknown>;
  if (!nodes || typeof nodes !== "object") {
    return figmaExample as Record<string, unknown>;
  }

  const first = Object.values(nodes as Record<string, unknown>)[0];
  const document =
    first && typeof first === "object" && "document" in first
      ? (first as { document: unknown }).document
      : undefined;

  return document ? { ...meta, document } : meta;
}

/** Mocks only Figma file tree fetches (`/files` and `/files/.../nodes`), not `/meta`. */
export const figmaHandlers = [
  http.get(`${FIGMA_API}/files/:fileKey/nodes`, () =>
    HttpResponse.json(figmaExample),
  ),
  http.get(`${FIGMA_API}/files/:fileKey`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("depth") !== "2") {
      return;
    }
    return HttpResponse.json(toFileTreeResponse());
  }),
];
