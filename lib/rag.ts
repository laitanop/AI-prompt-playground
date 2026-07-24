// Pure, framework-free RAG helpers: chunking, embedding math, and ranking.
// Kept free of Next.js / Anthropic imports so the logic is easy to reason about
// and reuse (mirrors how lib/grading.ts and lib/tools.ts isolate their logic).

import { SAMPLE_DOCUMENT } from "./rag-document";

export interface Chunk {
  id: string;
  heading: string;
  text: string;
}

/**
 * Structure-based chunking: split the source document along its section
 * boundaries so each labeled section becomes one self-contained chunk. This is
 * the strategy that works well for filings, which already have a clear heading
 * structure. A real 800-page document would produce hundreds of chunks; the
 * sample produces one per section.
 */
export function chunkDocument(): Chunk[] {
  return SAMPLE_DOCUMENT.map((section, i) => ({
    id: `chunk-${i + 1}`,
    heading: section.heading,
    text: `${section.heading}. ${section.body}`,
  }));
}

/** Cosine similarity between two equal-length vectors. Returns 0 for a zero vector. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
  "was", "were", "be", "as", "at", "by", "our", "we", "this", "that", "with",
  "from", "it", "its", "has", "have", "which", "any", "all", "than", "may",
]);

// Light singular/plural normalization so "risks" and "risk" count as the same
// term. Strips a trailing plural "s" from longer words (keeping "ss" endings like
// "business" intact). Crude but deterministic — enough for the lexical fallback.
function normalize(token: string): string {
  if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
    .map(normalize);
}

/**
 * Build a shared vocabulary (sorted list of unique tokens) from a set of texts.
 * All lexical-fallback vectors must be built against the same vocabulary so their
 * dimensions line up for cosine similarity.
 */
export function buildVocabulary(texts: string[]): string[] {
  const vocab = new Set<string>();
  for (const text of texts) {
    for (const token of tokenize(text)) vocab.add(token);
  }
  return [...vocab].sort();
}

/**
 * Inverse document frequency for each vocabulary term across a corpus. Terms that
 * appear in many chunks (e.g. "company") get a low weight; rare, distinctive terms
 * (e.g. "risk") get a high weight. This is what lets the lexical fallback tell a
 * topically-relevant chunk apart from one that merely shares filler words.
 */
export function computeIdf(texts: string[], vocab: string[]): number[] {
  const docTokenSets = texts.map((t) => new Set(tokenize(t)));
  const n = texts.length;
  return vocab.map((word) => {
    const df = docTokenSets.reduce(
      (count, set) => count + (set.has(word) ? 1 : 0),
      0,
    );
    return Math.log((n + 1) / (df + 1)) + 1;
  });
}

/**
 * Deterministic TF-IDF vector over a shared vocabulary — the no-API-key fallback
 * embedding. This captures *lexical* overlap only (shared words weighted by how
 * distinctive they are), not true semantic meaning, which is why the UI labels it
 * as a fallback. Pass the shared `idf` from computeIdf so every vector is weighted
 * consistently.
 */
export function lexicalEmbed(
  text: string,
  vocab: string[],
  idf: number[],
): number[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return vocab.map((word, i) => (counts.get(word) ?? 0) * idf[i]);
}

export interface RankedChunk {
  chunkId: string;
  score: number;
  selected: boolean;
}

/**
 * Rank chunk vectors by cosine similarity to the query vector, then flag the
 * top-k as "selected" (the chunks that get sent to Claude as context).
 */
export function rankChunks(
  queryVec: number[],
  chunkVecs: { chunkId: string; vector: number[] }[],
  k: number,
): RankedChunk[] {
  const scored = chunkVecs
    .map(({ chunkId, vector }) => ({
      chunkId,
      score: cosineSimilarity(queryVec, vector),
    }))
    .sort((a, b) => b.score - a.score);

  return scored.map((s, i) => ({ ...s, selected: i < k }));
}

// Teaching metadata for the three chunking strategies the section explains.
export interface ChunkStrategy {
  id: string;
  name: string;
  description: string;
  example: string;
}

export const CHUNK_STRATEGIES: ChunkStrategy[] = [
  {
    id: "size",
    name: "Size-Based Chunking",
    description:
      "Split the text into fixed-size pieces — e.g. every 500 tokens — often with a small overlap so ideas that straddle a boundary aren't lost. Simple and predictable, but it can cut a sentence or a table in half.",
    example: "Every 500 tokens, with 50 tokens of overlap between chunks.",
  },
  {
    id: "structure",
    name: "Structure-Based Chunking",
    description:
      "Split along the document's own structure — sections, headings, paragraphs. Each chunk stays semantically self-contained. Ideal for filings, contracts, and docs that already have clear headings. (This demo uses it.)",
    example: "One chunk per section: Risk Factors, Financial Statements, ...",
  },
  {
    id: "semantic",
    name: "Semantic-Based Chunking",
    description:
      "Group sentences by meaning: start a new chunk when the topic shifts, detected by comparing sentence embeddings. Produces the most coherent chunks but costs the most to compute up front.",
    example: "A new chunk begins wherever the subject changes topic.",
  },
];

// Number of top chunks retrieved and sent to Claude as grounding context.
export const TOP_K = 3;
