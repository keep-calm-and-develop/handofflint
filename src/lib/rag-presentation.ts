import {
  chunkMarkdown,
  fetchMarkdownContent,
  isKeepableChunk,
  retrieveTopChunks,
  scoreChunks,
  tokenize,
  type ScoredChunk,
} from "@/lib/agent/tools/search-guidelines";

export const DESIGN_MANUAL_URL =
  "https://raw.githubusercontent.com/RayFernando1337/llm-cursor-rules/main/fire-your-design-team.md";

export const DEMO_QUERIES = [
  "typography font sizes weights",
  "8pt grid spacing padding",
  "shadcn tailwind oklch colors",
  "auto layout clipping overflow",
  "dark mode accessibility contrast",
  "primary brand accent color background foreground",
] as const;

const TOP_K = 3;

export interface ChunkPreview {
  index: number;
  text: string;
  length: number;
  kept: boolean;
}

export interface RankedChunkPreview {
  rank: number | null;
  score: number;
  matchedKeywords: string[];
  preview: string;
  includedInTopK: boolean;
  filteredByMinScore: boolean;
}

export interface QueryDemoResult {
  query: string;
  tokens: string[];
  minScore: number;
  totalMatches: number;
  status: "ok" | "no_matches";
  rankedChunks: RankedChunkPreview[];
  context: string;
}

export interface RagPresentationData {
  url: string;
  fetchStats: { bytes: number; lines: number };
  chunkStats: { rawCount: number; keptCount: number; droppedCount: number };
  keptChunks: ChunkPreview[];
  droppedExamples: string[];
  queries: QueryDemoResult[];
}

function truncate(text: string, max = 140): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}

function buildQueryDemo(query: string, chunks: string[]): QueryDemoResult {
  const tokens = tokenize(query);
  const minScore = tokens.length >= 5 ? 2 : 1;
  const scored = scoreChunks(query, chunks);
  const context = retrieveTopChunks(scored, tokens.length, TOP_K);

  const ranked = [...scored]
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  const topK = ranked.filter((c) => c.score >= minScore).slice(0, TOP_K);
  const topKRankByText = new Map(topK.map((c, i) => [c.text, i + 1]));

  const rankedChunks: RankedChunkPreview[] = ranked.slice(0, 8).map((chunk) => ({
    rank: topKRankByText.get(chunk.text) ?? null,
    score: chunk.score,
    matchedKeywords: chunk.matchedKeywords,
    preview: truncate(chunk.text),
    includedInTopK: topKRankByText.has(chunk.text),
    filteredByMinScore: chunk.score > 0 && chunk.score < minScore,
  }));

  return {
    query,
    tokens,
    minScore,
    totalMatches: scored.filter((c) => c.score > 0).length,
    status: context ? "ok" : "no_matches",
    rankedChunks,
    context,
  };
}

export async function buildRagPresentationData(): Promise<RagPresentationData> {
  const markdown = await fetchMarkdownContent(DESIGN_MANUAL_URL);
  const rawChunks = markdown.split(/\n\n+/);
  const kept = chunkMarkdown(markdown);

  const chunkPreviews: ChunkPreview[] = rawChunks.map((raw, index) => {
    const text = raw.trim();
    return {
      index,
      text,
      length: text.length,
      kept: isKeepableChunk(text),
    };
  });

  const droppedExamples = chunkPreviews
    .filter((c) => !c.kept && c.text.length > 0)
    .slice(0, 6)
    .map((c) => c.text);

  const queries = DEMO_QUERIES.map((query) => buildQueryDemo(query, kept));

  return {
    url: DESIGN_MANUAL_URL,
    fetchStats: {
      bytes: markdown.length,
      lines: markdown.split("\n").length,
    },
    chunkStats: {
      rawCount: rawChunks.length,
      keptCount: kept.length,
      droppedCount: rawChunks.length - kept.length,
    },
    keptChunks: chunkPreviews.filter((c) => c.kept).slice(0, 6),
    droppedExamples,
    queries,
  };
}

/** Pure helper for live tokenization demos in the UI. */
export function demoTokenize(text: string): string[] {
  return tokenize(text);
}

/** Pure helper to score a custom query against pre-fetched chunks. */
export function demoScoreQuery(
  query: string,
  chunks: string[],
): { scored: ScoredChunk[]; minScore: number } {
  const tokens = tokenize(query);
  return {
    scored: scoreChunks(query, chunks),
    minScore: tokens.length >= 5 ? 2 : 1,
  };
}
