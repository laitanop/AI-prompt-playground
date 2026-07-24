// Server-only embedding layer. Uses Voyage AI (Anthropic's recommended embeddings
// provider — the Claude API has no embeddings endpoint) when a VOYAGE_API_KEY is
// configured, and falls back to a local lexical vector otherwise so the demo
// always runs end-to-end. Never throws for a missing key.

import { buildVocabulary, computeIdf, lexicalEmbed } from "./rag";

export type EmbeddingSource = "voyage" | "lexical";

export interface EmbedResult {
  vectors: number[][];
  source: EmbeddingSource;
}

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3-lite";

/**
 * Embed a batch of texts. The query is passed as the last element by convention,
 * but this function treats all inputs uniformly — the caller decides which vector
 * is the query. Returns vectors in the same order as the input texts.
 */
export async function embedTexts(texts: string[]): Promise<EmbedResult> {
  const apiKey = process.env.VOYAGE_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(VOYAGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: VOYAGE_MODEL, input: texts }),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          data: { embedding: number[]; index: number }[];
        };
        // Voyage returns items with an `index` — sort to guarantee input order.
        const vectors = [...json.data]
          .sort((a, b) => a.index - b.index)
          .map((d) => d.embedding);
        return { vectors, source: "voyage" };
      }
      console.error(`Voyage API returned ${res.status}; using lexical fallback.`);
    } catch (error) {
      console.error("Voyage API request failed; using lexical fallback.", error);
    }
  }

  // Fallback: a shared vocabulary keeps every vector the same dimensionality, and
  // a shared IDF weights distinctive terms consistently across chunks and query.
  const vocab = buildVocabulary(texts);
  const idf = computeIdf(texts, vocab);
  const vectors = texts.map((text) => lexicalEmbed(text, vocab, idf));
  return { vectors, source: "lexical" };
}
