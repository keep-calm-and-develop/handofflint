import { http, HttpResponse } from "msw";

import {
  getMockFigmaTreeData,
  toMockFileTreeResponse,
} from "@/lib/figma/mock-data";
import type { JsonBodyType } from "msw";

const FIGMA_API = "https://api.figma.com/v1";

/** Stable mock render URL returned for any renderable node in tests/dev. */
export const MOCK_IMAGE_URL =
  "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/33f30ad2-8de0-4e29-a22e-d47ecf272e67";

/** Node ID that the mock treats as unrenderable (returns null in image map). */
export const MOCK_NULL_NODE_ID = "unrenderable:1";

/** MSW handlers for Figma REST endpoints used by fetchFigmaTree and fetchFigmaImages. */
export const figmaHandlers = [
  http.get(`${FIGMA_API}/files/:fileKey/meta`, () => {
    const { version } = toMockFileTreeResponse();
    return HttpResponse.json({
      file: { version: typeof version === "string" ? version : "mock-version" },
    });
  }),
  http.get(`${FIGMA_API}/files/:fileKey/nodes`, () =>
    HttpResponse.json(getMockFigmaTreeData("1:4") as JsonBodyType),
  ),
  http.get(`${FIGMA_API}/files/:fileKey`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("depth") !== "2") {
      return;
    }
    return HttpResponse.json(getMockFigmaTreeData(null) as JsonBodyType);
  }),
  /**
   * Mock for GET /v1/images/:fileKey — returns a stable URL for every
   * requested node except MOCK_NULL_NODE_ID which gets null (unrenderable).
   */
  http.get(`${FIGMA_API}/images/:fileKey`, ({ request }) => {
    const url = new URL(request.url);
    const ids = (url.searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => decodeURIComponent(id).trim())
      .filter(Boolean);

    const images: Record<string, string | null> = {};
    for (const id of ids) {
      images[id] = id === MOCK_NULL_NODE_ID ? null : MOCK_IMAGE_URL;
    }

    return HttpResponse.json({ err: null, images } as JsonBodyType);
  }),
];
