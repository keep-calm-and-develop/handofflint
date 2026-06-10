/**
 * Prompt-injection and SSRF guardrails for user-supplied agent inputs.
 */

export type GuardrailResult =
  | { ok: true }
  | { ok: false; reason: string };

const MAX_URL_LENGTH = 2048;
const MAX_MARKDOWN_BYTES = 512_000;
const MAX_RAG_QUERY_LENGTH = 500;

/** Hostnames that must never be fetched (SSRF). */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
]);

/** Figma render CDN hosts returned by the Images API. */
const ALLOWED_IMAGE_HOST_SUFFIXES = [
  ".amazonaws.com",
  "figma.com",
];

/**
 * Case-insensitive patterns commonly used to hijack LLM / RAG context.
 * Kept intentionally simple for POC — not a substitute for full content moderation.
 */
export const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(your\s+)?(system\s+)?instructions/i,
  /forget\s+(everything|all)\s+(you\s+)?(were\s+)?told/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /\b(system\s+prompt|developer\s+message)\s*:/i,
  /\bdo\s+not\s+follow\b.*\binstructions\b/i,
  /\boverride\b.*\b(instructions|rules|constraints)\b/i,
  /\bact\s+as\b.*\b(without|ignoring)\b/i,
  /\b(jailbreak|dan\s+mode)\b/i,
  /<\s*script[\s>]/i,
  /<!--\s*inject/i,
];

function parseHttpUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function isPrivateOrReservedIpv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;

  const octets = match.slice(1).map(Number);
  if (octets.some((n) => n > 255)) return true;

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function isBlockedFetchHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (isPrivateOrReservedIpv4(host)) return true;
  return false;
}

export function isMarkdownPath(pathname: string): boolean {
  const path = pathname.split("?")[0]?.toLowerCase() ?? "";
  return path.endsWith(".md") || path.endsWith(".markdown");
}

export function validateFileKey(fileKey: string): GuardrailResult {
  const trimmed = fileKey.trim();
  if (!trimmed) return { ok: false, reason: "Missing fileKey" };
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return { ok: false, reason: "Invalid fileKey format" };
  }
  return { ok: true };
}

export function validateFigmaNodeId(nodeId: string): GuardrailResult {
  const trimmed = nodeId.trim();
  if (!trimmed) return { ok: false, reason: "Missing nodeId" };
  if (!/^[a-zA-Z0-9]+:[a-zA-Z0-9]+$/.test(trimmed)) {
    return { ok: false, reason: "Invalid nodeId format" };
  }
  return { ok: true };
}

export function validateDesignManualUrl(raw: string): GuardrailResult {
  const url = parseHttpUrl(raw);
  if (!url) {
    return {
      ok: false,
      reason: "designManualUrl must be a valid http(s) URL",
    };
  }

  if (isBlockedFetchHost(url.hostname)) {
    return {
      ok: false,
      reason: "designManualUrl must not target internal or private hosts",
    };
  }

  if (!isMarkdownPath(url.pathname)) {
    return {
      ok: false,
      reason: "designManualUrl must point to a .md or .markdown file",
    };
  }

  return { ok: true };
}

export function validateVisionImageUrl(raw: string): GuardrailResult {
  const url = parseHttpUrl(raw);
  if (!url) {
    return {
      ok: false,
      reason: "imageUrl must be a valid http(s) URL",
    };
  }

  if (isBlockedFetchHost(url.hostname)) {
    return {
      ok: false,
      reason: "imageUrl must not target internal or private hosts",
    };
  }

  const host = url.hostname.toLowerCase();
  const allowed = ALLOWED_IMAGE_HOST_SUFFIXES.some((suffix) =>
    suffix.startsWith(".")
      ? host.endsWith(suffix) || host === suffix.slice(1)
      : host === suffix || host.endsWith(`.${suffix}`),
  );

  if (!allowed) {
    return {
      ok: false,
      reason: "imageUrl must be a Figma CDN URL",
    };
  }

  return { ok: true };
}

export function validateRagQuery(query: string): GuardrailResult {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, reason: "Search query must not be empty" };
  }
  if (trimmed.length > MAX_RAG_QUERY_LENGTH) {
    return {
      ok: false,
      reason: `Search query must be at most ${MAX_RAG_QUERY_LENGTH} characters`,
    };
  }

  const injection = scanForPromptInjection(trimmed);
  if (injection.detected) {
    return {
      ok: false,
      reason: "Search query contains disallowed instruction-like text",
    };
  }

  return { ok: true };
}

export function scanForPromptInjection(
  text: string,
): { detected: false } | { detected: true; pattern: string } {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { detected: true, pattern: pattern.source };
    }
  }
  return { detected: false };
}

export function looksLikeHtmlDocument(text: string): boolean {
  const head = text.trimStart().slice(0, 256).toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html");
}

export function validateMarkdownContent(
  text: string,
  contentType?: string | null,
): GuardrailResult {
  if (text.length > MAX_MARKDOWN_BYTES) {
    return {
      ok: false,
      reason: "Design manual exceeds maximum allowed size",
    };
  }

  if (contentType) {
    const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    const allowedTypes = new Set([
      "text/markdown",
      "text/plain",
      "application/octet-stream",
    ]);
    if (
      type &&
      !allowedTypes.has(type) &&
      !type.endsWith("+json") &&
      type !== "application/json"
    ) {
      // GitHub raw often serves text/plain; block obvious binary / HTML types.
      if (
        type.startsWith("text/html") ||
        type.startsWith("application/javascript") ||
        type.startsWith("text/javascript")
      ) {
        return {
          ok: false,
          reason: "Design manual URL did not return markdown text",
        };
      }
    }
  }

  if (looksLikeHtmlDocument(text)) {
    return {
      ok: false,
      reason: "Design manual URL returned HTML instead of markdown",
    };
  }

  const injection = scanForPromptInjection(text);
  if (injection.detected) {
    return {
      ok: false,
      reason:
        "Design manual contains disallowed instruction-like content for the RAG system",
    };
  }

  return { ok: true };
}

/** Strip lines that look like prompt-injection attempts before RAG retrieval. */
export function sanitizeMarkdownForRag(text: string): string {
  return text
    .split("\n")
    .filter((line) => !scanForPromptInjection(line).detected)
    .join("\n");
}

export type ValidatedDesignManual =
  | { ok: true; markdown: string; url: string }
  | { ok: false; reason: string };

/**
 * Validates URL policy, fetches markdown, and scans content for injection / HTML.
 */
export async function validateAndFetchDesignManual(
  rawUrl: string,
): Promise<ValidatedDesignManual> {
  const urlCheck = validateDesignManualUrl(rawUrl);
  if (!urlCheck.ok) return urlCheck;

  const url = rawUrl.trim();
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return { ok: false, reason: "Failed to fetch design manual URL" };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: `Design manual fetch failed: ${response.status}`,
    };
  }

  const text = await response.text();
  const contentCheck = validateMarkdownContent(
    text,
    response.headers.get("content-type"),
  );
  if (!contentCheck.ok) return contentCheck;

  return {
    ok: true,
    url,
    markdown: sanitizeMarkdownForRag(text),
  };
}
