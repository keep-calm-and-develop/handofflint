import { ensureFigmaMockServer } from "@/mocks/ensure-server";
import { FigmaApiError, figmaFetch, parseFigmaResponse } from "@/lib/figma/fetch";
import { isFigmaApiMockEnabled } from "@/lib/figma/mock-enabled";
import { rateLimitLogFields } from "@/lib/figma/retry-after";

export type FigmaImageFormat = "png" | "jpg" | "svg" | "pdf";

export interface FetchFigmaImagesOptions {
  /** Multiplier applied to the node's natural size. Range: 0.01–4. Default: 2. */
  scale?: number;
  /** Image encoding format. Default: "png". */
  format?: FigmaImageFormat;
  /** Optional PAT override (request header or session store). */
  figmaAccessToken?: string;
}

/**
 * Per-node render result.
 *
 * - `url`: a 30-day pre-signed S3 URL to the rendered image.
 * - `null`: the node could not be rendered (invisible / 0% opacity / off-canvas).
 *   Callers should treat `null` as "no visual to inspect" and skip vision critique.
 */
export type FigmaImageUrl = string | null;

export interface FetchFigmaImagesResult {
  /**
   * Map of nodeId → render URL or null.
   * A null value means the Figma render API returned null for that node —
   * the node exists in the tree but produces no visible pixels.
   */
  images: Record<string, FigmaImageUrl>;
  source: "api" | "cache";
}

const FIGMA_API_BASE = "https://api.figma.com/v1";
const DEFAULT_SCALE = 2;
const DEFAULT_FORMAT: FigmaImageFormat = "png";
const MAX_IDS_PER_REQUEST = 50;

interface ImageCacheEntry {
  images: Record<string, FigmaImageUrl>;
  fetchedAt: number;
}

const IMAGE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const imageStore = new Map<string, ImageCacheEntry>();

function logImage(event: string, details?: Record<string, unknown>): void {
  console.log("[figma-image-cache]", event, details ?? "");
}

function buildImageCacheKey(
  fileKey: string,
  nodeIds: string[],
  scale: number,
  format: FigmaImageFormat,
): string {
  return `${fileKey}:${[...nodeIds].sort().join(",")}:${format}@${scale}x`;
}

function getImageCache(key: string): ImageCacheEntry | null {
  const entry = imageStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > IMAGE_CACHE_TTL_MS) {
    imageStore.delete(key);
    return null;
  }
  return entry;
}

function setImageCache(key: string, entry: ImageCacheEntry): void {
  imageStore.set(key, entry);
}

/** Clears image URL cache (for tests). */
export function clearFigmaImageCache(): void {
  imageStore.clear();
}

interface FigmaImagesApiResponse {
  err: string | null;
  images: Record<string, string | null>;
  status?: number;
}

function parseFigmaImagesResponse(raw: unknown): Record<string, FigmaImageUrl> {
  if (typeof raw !== "object" || raw === null) {
    throw new FigmaApiError("Unexpected response from Figma images API", 500);
  }

  const body = raw as FigmaImagesApiResponse;

  if (body.err) {
    throw new FigmaApiError(
      `Figma images API error: ${body.err}`,
      body.status ?? 500,
    );
  }

  if (!body.images || typeof body.images !== "object") {
    throw new FigmaApiError("Figma images API returned no image map", 500);
  }

  return Object.fromEntries(
    Object.entries(body.images).map(([id, url]) => [id, url ?? null]),
  );
}

/**
 * Renders one or more Figma nodes to images via `GET /v1/images/:fileKey`.
 *
 * Reuses the shared PAT, 429 handling, and mock-server setup from the tree
 * client. Results are cached for 10 minutes (image URLs are 30-day S3 links).
 *
 * @see https://www.figma.com/developers/api#get-images-endpoint
 */
export async function fetchFigmaImages(
  fileKey: string,
  nodeIds: string[],
  options: FetchFigmaImagesOptions = {},
): Promise<FetchFigmaImagesResult | null> {
  await ensureFigmaMockServer();

  const token =
    options.figmaAccessToken?.trim() ||
    process.env.FIGMA_ACCESS_TOKEN?.trim();
  if (!token) return null;

  if (nodeIds.length === 0) {
    return { images: {}, source: "api" };
  }

  const scale = options.scale ?? DEFAULT_SCALE;
  const format = options.format ?? DEFAULT_FORMAT;
  const cacheKey = buildImageCacheKey(fileKey, nodeIds, scale, format);

  const cached = isFigmaApiMockEnabled() ? null : getImageCache(cacheKey);
  if (cached) {
    logImage("serve", { cacheKey, fileKey, reason: "hit" });
    return { images: cached.images, source: "cache" };
  }

  logImage("api_fetch", { cacheKey, fileKey, nodeIds });

  const batches = chunk(nodeIds, MAX_IDS_PER_REQUEST);
  const merged: Record<string, FigmaImageUrl> = {};

  for (const batch of batches) {
    const url = buildImagesUrl(fileKey, batch, scale, format);
    let res: Response;

    try {
      res = await figmaFetch(url, token);
    } catch (err) {
      if (err instanceof FigmaApiError && err.status === 429) {
        const stale = imageStore.get(cacheKey);
        if (stale) {
          logImage("serve", {
            cacheKey,
            fileKey,
            reason: "rate_limited_stale",
            expired: Date.now() - stale.fetchedAt > IMAGE_CACHE_TTL_MS,
            ...rateLimitLogFields(err.rateLimit),
          });
          return { images: stale.images, source: "cache" };
        }
        logImage("rate_limited_no_stale", {
          cacheKey,
          fileKey,
          ...rateLimitLogFields(err.rateLimit),
        });
      }
      throw err;
    }

    const raw = await parseFigmaResponse(res);
    Object.assign(merged, parseFigmaImagesResponse(raw));
  }

  setImageCache(cacheKey, { images: merged, fetchedAt: Date.now() });
  return { images: merged, source: "api" };
}

function buildImagesUrl(
  fileKey: string,
  nodeIds: string[],
  scale: number,
  format: FigmaImageFormat,
): string {
  const ids = nodeIds.map(encodeURIComponent).join(",");
  return `${FIGMA_API_BASE}/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
