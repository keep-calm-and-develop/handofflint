import { tool } from "ai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_CHUNK_LENGTH = 30;
const TOP_K_RESULTS = 3;
const CHUNK_SEPARATOR = "\n\n---\n\n";

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(
  event: string,
  details?: Record<string, unknown>,
): void {
  console.log("[search-guidelines]", event, details ?? "");
}

// ---------------------------------------------------------------------------
// Input schema — requires keyword query + remote markdown URL
// ---------------------------------------------------------------------------

const searchGuidelinesInputSchema = z.object({
  query: z
    .string()
    .describe(
      "A keyword search query describing the layout issue or guideline topic to look up (e.g. 'auto-layout clipping overflow').",
    ),
  designManualUrl: z
    .string()
    .url()
    .describe(
      "The raw GitHub URL of the markdown design manual to search (e.g. 'https://raw.githubusercontent.com/org/repo/main/GUIDELINES.md').",
    ),
});

export type SearchGuidelinesInput = z.infer<typeof searchGuidelinesInputSchema>;

// ---------------------------------------------------------------------------
// Output schema
// ---------------------------------------------------------------------------

export const SearchGuidelinesOutputSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    query: z.string(),
    matchCount: z.number(),
    context: z.string(),
  }),
  z.object({
    status: z.literal("no_matches"),
    query: z.string(),
    message: z.string(),
  }),
  z.object({
    status: z.literal("fetch_error"),
    url: z.string(),
    message: z.string(),
  }),
]);

export type SearchGuidelinesOutput = z.infer<typeof SearchGuidelinesOutputSchema>;

// ---------------------------------------------------------------------------
// Sub-step 4.2.2: Ingestion — fetch raw markdown from URL
// ---------------------------------------------------------------------------

export async function fetchMarkdownContent(url: string): Promise<string> {
  log("fetch_start", { url });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch markdown: ${response.status} ${response.statusText}`,
    );
  }

  const text = await response.text();
  log("fetch_complete", { url, bytes: text.length });
  return text;
}

// ---------------------------------------------------------------------------
// Sub-step 4.2.3: Chunking — split by double-newline, filter noise
// ---------------------------------------------------------------------------

/**
 * Keeps substantive paragraphs and markdown headings. Short fragments like
 * "---" or "hi" are dropped, but section headers (e.g. "## Typography System")
 * are kept because they label topics for keyword matching.
 */
export function isKeepableChunk(chunk: string): boolean {
  const trimmed = chunk.trim();
  if (!trimmed) return false;
  if (trimmed.length >= MIN_CHUNK_LENGTH) return true;
  return /^#{1,6}\s+\S/.test(trimmed);
}

export function chunkMarkdown(text: string): string[] {
  const rawChunks = text.split(/\n\n+/);
  const filtered = rawChunks
    .map((chunk) => chunk.trim())
    .filter(isKeepableChunk);

  log("chunk_complete", {
    rawCount: rawChunks.length,
    filteredCount: filtered.length,
    droppedCount: rawChunks.length - filtered.length,
  });

  return filtered;
}

// ---------------------------------------------------------------------------
// Sub-step 4.2.4: Keyword intersection scoring
// ---------------------------------------------------------------------------

export interface ScoredChunk {
  text: string;
  score: number;
  matchedKeywords: string[];
}

/**
 * Tokenizes a string into clean lowercase alphanumeric words.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

/**
 * Scores each chunk by counting exact keyword overlaps between
 * the query tokens and the chunk tokens.
 */
export function scoreChunks(query: string, chunks: string[]): ScoredChunk[] {
  const queryTokens = tokenize(query);
  const querySet = new Set(queryTokens);

  log("scoring_start", {
    queryTokens: queryTokens.length,
    uniqueQueryTokens: querySet.size,
    chunkCount: chunks.length,
  });

  const scored = chunks.map((chunkText) => {
    const chunkTokens = tokenize(chunkText);
    const chunkSet = new Set(chunkTokens);

    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of querySet) {
      if (chunkSet.has(keyword)) {
        score++;
        matchedKeywords.push(keyword);
      }
    }

    return { text: chunkText, score, matchedKeywords };
  });

  return scored;
}

// ---------------------------------------------------------------------------
// Sub-step 4.2.5: Retrieval — sort, pick top K, join
// ---------------------------------------------------------------------------

export function retrieveTopChunks(
  scored: ScoredChunk[],
  queryTokenCount: number = 0,
  limit: number = TOP_K_RESULTS,
): string {
  // For multi-keyword queries (5+ unique tokens), require at least 2 matches
  // to prevent a single common word (e.g. "primary" appearing in a typography section)
  // from producing misleading guideline results for unrelated topics.
  const minScore = queryTokenCount >= 5 ? 2 : 1;

  const ranked = [...scored]
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  log("retrieval_complete", {
    totalWithMatches: scored.filter((c) => c.score > 0).length,
    topK: ranked.length,
    minScoreApplied: minScore,
    topScores: ranked.map((c) => ({
      score: c.score,
      keywords: c.matchedKeywords,
      preview: c.text.slice(0, 80) + (c.text.length > 80 ? "…" : ""),
    })),
  });

  if (ranked.length === 0) {
    return "";
  }

  return ranked.map((c) => c.text).join(CHUNK_SEPARATOR);
}

// ---------------------------------------------------------------------------
// Full execution pipeline
// ---------------------------------------------------------------------------

export async function executeSearchGuidelines(
  input: SearchGuidelinesInput,
): Promise<SearchGuidelinesOutput> {
  const { query, designManualUrl } = input;

  log("pipeline_start", { query, designManualUrl });

  let markdown: string;
  try {
    markdown = await fetchMarkdownContent(designManualUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown fetch error";
    log("pipeline_error", { phase: "fetch", message });
    return { status: "fetch_error", url: designManualUrl, message };
  }

  const chunks = chunkMarkdown(markdown);

  if (chunks.length === 0) {
    log("pipeline_empty", { reason: "no chunks survived filtering" });
    return {
      status: "no_matches",
      query,
      message: "The design manual produced no parseable content blocks.",
    };
  }

  const scored = scoreChunks(query, chunks);
  const queryTokenCount = tokenize(query).length;
  const context = retrieveTopChunks(scored, queryTokenCount);

  if (!context) {
    log("pipeline_no_matches", { query });
    return {
      status: "no_matches",
      query,
      message: `No paragraphs matched the keywords in "${query}".`,
    };
  }

  log("pipeline_success", { query, contextLength: context.length });

  return {
    status: "ok",
    query,
    matchCount: scored.filter((c) => c.score > 0).length,
    context,
  };
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function makeSearchGuidelinesTool() {
  return tool({
    description:
      "Search a remote markdown design manual for layout guidelines relevant to the query. " +
      "Fetches the file, chunks it by paragraph, ranks paragraphs by keyword overlap, " +
      "and returns the top 3 most relevant sections. Use this to ground layout recommendations " +
      "in documented best practices rather than hallucinating advice.",
    inputSchema: searchGuidelinesInputSchema,
    outputSchema: SearchGuidelinesOutputSchema,
    execute: async (input) => executeSearchGuidelines(input),
  });
}
