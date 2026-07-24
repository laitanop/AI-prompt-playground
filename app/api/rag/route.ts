import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/anthropic";
import { chunkDocument, rankChunks, TOP_K } from "@/lib/rag";
import { embedTexts, type EmbeddingSource } from "@/lib/voyage";

const MODEL = "claude-haiku-4-5-20251001";

interface RankedChunkResult {
  id: string;
  heading: string;
  snippet: string;
  score: number;
  selected: boolean;
}

function validate(body: unknown): { question: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const { question } = body as Record<string, unknown>;
  if (typeof question !== "string" || !question.trim()) return null;
  return { question: question.trim() };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validate(body);

    if (!validated) {
      return NextResponse.json(
        { error: "Invalid request: 'question' is required" },
        { status: 400 },
      );
    }

    const { question } = validated;

    // Step 1: Chunk the source document (structure-based).
    const chunks = chunkDocument();

    // Step 2 + 4: Embed every chunk and the query together. In a real pipeline the
    // chunk embeddings (Step 2) would be computed once and stored in a vector
    // database (Step 3); here we recompute them each request for a live demo.
    const { vectors, source } = await embedTexts([
      ...chunks.map((c) => c.text),
      question,
    ]);
    const queryVec = vectors[vectors.length - 1];
    const chunkVecs = chunks.map((c, i) => ({
      chunkId: c.id,
      vector: vectors[i],
    }));

    // Step 5: Find the chunks whose embeddings are most similar to the query.
    const ranked = rankChunks(queryVec, chunkVecs, TOP_K);
    const chunkById = new Map(chunks.map((c) => [c.id, c]));

    const rankedChunks: RankedChunkResult[] = ranked.map((r) => {
      const chunk = chunkById.get(r.chunkId)!;
      return {
        id: chunk.id,
        heading: chunk.heading,
        snippet:
          chunk.text.length > 220
            ? `${chunk.text.slice(0, 220)}…`
            : chunk.text,
        score: r.score,
        selected: r.selected,
      };
    });

    // Build the grounded prompt from only the top-k retrieved chunks.
    const context = ranked
      .filter((r) => r.selected)
      .map((r) => {
        const chunk = chunkById.get(r.chunkId)!;
        return `[${chunk.heading}]\n${chunk.text}`;
      })
      .join("\n\n");

    const systemPrompt =
      "You are a financial-document assistant. Answer the user's question using " +
      "ONLY the provided context excerpts. If the answer is not contained in the " +
      "context, say that the document does not appear to contain that information. " +
      "Be concise and do not invent figures.";

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Context excerpts:\n\n${context}\n\nQuestion: ${question}`,
        },
      ],
    });

    const answer = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    const embeddingSource: EmbeddingSource = source;

    return NextResponse.json({ answer, rankedChunks, embeddingSource });
  } catch (error) {
    console.error("RAG API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
