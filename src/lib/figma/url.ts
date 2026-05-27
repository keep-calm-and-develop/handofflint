export interface ParsedFigmaUrl {
  ok: true;
  fileKey: string;
  nodeId: string | null;
}

export interface InvalidFigmaUrl {
  ok: false;
  error: string;
}

export type ParseFigmaUrlResult = ParsedFigmaUrl | InvalidFigmaUrl;

const FIGMA_HOST = "figma.com";

/**
 * Parses design/file URLs and optional `node-id` query (123-456 → 123:456).
 */
export function parseFigmaUrl(raw: string): ParseFigmaUrlResult {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Invalid Figma URL" };
  }

  const host = parsed.hostname.replace(/^www\./, "");
  if (host !== FIGMA_HOST) {
    return { ok: false, error: "Invalid Figma URL" };
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const typeIndex = segments.findIndex(
    (s) => s === "design" || s === "file" || s === "proto",
  );

  if (typeIndex === -1 || typeIndex + 1 >= segments.length) {
    return { ok: false, error: "Invalid Figma URL" };
  }

  const fileKey = segments[typeIndex + 1];
  if (!/^[a-zA-Z0-9]+$/.test(fileKey)) {
    return { ok: false, error: "Invalid Figma URL" };
  }

  const nodeIdParam = parsed.searchParams.get("node-id");
  const nodeId = nodeIdParam
    ? nodeIdParam.replace(/-/g, ":")
    : null;

  return { ok: true, fileKey, nodeId };
}

/** Deep link for opening a node in Figma (design URL + node-id query). */
export function buildFigmaNodeUrl(fileKey: string, nodeId: string): string {
  const nodeIdQuery = nodeId.replace(/:/g, "-");
  return `https://www.figma.com/design/${fileKey}?node-id=${nodeIdQuery}`;
}
