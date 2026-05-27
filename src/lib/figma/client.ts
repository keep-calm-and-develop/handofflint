const FIGMA_API_BASE = "https://api.figma.com/v1";

export class FigmaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "FigmaApiError";
  }
}

/**
 * Fetches a node subtree when `nodeId` is set; otherwise file metadata + shallow tree.
 * Skips the request when `FIGMA_ACCESS_TOKEN` is unset.
 * @see https://www.figma.com/developers/api#get-file-nodes-endpoint
 * @see https://www.figma.com/developers/api#get-files-endpoint
 */
export async function fetchFigmaTree(
  fileKey: string,
  nodeId: string | null,
): Promise<unknown | null> {
  const token = process.env.FIGMA_ACCESS_TOKEN?.trim();
  if (!token) {
    return null;
  }

  const url = nodeId
    ? `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`
    : `${FIGMA_API_BASE}/files/${fileKey}?depth=2`;

  const res = await fetch(url, {
    headers: { "X-Figma-Token": token },
    cache: "no-store",
  });

  if (res.status === 403 || res.status === 404) {
    throw new FigmaApiError(
      "Cannot access file — check permissions",
      res.status,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new FigmaApiError(
      body
        ? `Figma API error (${res.status}): ${body.slice(0, 200)}`
        : `Figma API error (${res.status})`,
      res.status,
    );
  }

  return res.json();
}
