import { http, HttpResponse } from "msw";

import {
  getMockFigmaTreeData,
  toMockFileTreeResponse,
} from "@/lib/figma/mock-data";
import type { JsonBodyType } from "msw";

const FIGMA_API = "https://api.figma.com/v1";

/** MSW handlers for Figma REST endpoints used by fetchFigmaTree. */
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
];
