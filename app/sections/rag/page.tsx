"use client";

import { useState } from "react";
import Image from "next/image";
import SectionNav from "@/components/SectionNav";
import { CHUNK_STRATEGIES, chunkDocument, TOP_K } from "@/lib/rag";

const QUESTION_PRESETS = [
  "What risk factors does this company have?",
  "How much revenue did the company make and how fast is it growing?",
  "Is the company involved in any lawsuits?",
  "What is the CEO's salary?",
];

const RAG_FLOW = [
  {
    title: "Chunk Your Source Text",
    body: "Split the document into smaller, self-contained pieces during a one-time preprocessing step. An 800-page filing becomes hundreds of chunks.",
  },
  {
    title: "Generate Embeddings",
    body: "Turn each chunk into a vector — a list of numbers that captures its meaning — using an embeddings model (here, Voyage AI).",
  },
  {
    title: "Store in Vector Database",
    body: "Save every chunk's vector in a vector database so you can search across them quickly. (This demo keeps them in memory for one request.)",
  },
  {
    title: "Process User Query",
    body: "When a question arrives, embed it the same way — producing a query vector in the same space as the chunks.",
  },
  {
    title: "Find Similar Embeddings",
    body: "Compare the query vector to every chunk vector with cosine similarity and take the top matches — the chunks most relevant to the question.",
  },
  {
    title: "Create the Final Prompt",
    body: "Assemble the prompt Claude actually sees: the top retrieved chunks as context plus the user's question, so Claude answers grounded only in the relevant passages.",
  },
];

// The chunks are static (structure-based split of the sample document), so we can
// compute them once at module load for the preview.
const CHUNKS = chunkDocument();

interface RankedChunk {
  id: string;
  heading: string;
  snippet: string;
  score: number;
  selected: boolean;
}

interface RagResult {
  answer: string;
  rankedChunks: RankedChunk[];
  embeddingSource: "voyage" | "lexical";
}

export default function RagPage() {
  const [question, setQuestion] = useState(QUESTION_PRESETS[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RagResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid = question.trim().length > 0;

  const handleRun = async () => {
    if (!isValid) return;

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to run retrieval");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main>
      <div className="container">
        <SectionNav />
        <header>
          <h1>🔎 Section 4: Retrieval-Augmented Generation</h1>
          <p>
            Answer questions about an 800-page document by feeding Claude only the
            handful of passages that actually matter.
          </p>
        </header>

        {/* The problem */}
        <div className="learning-callout">
          <div className="callout-icon">💡</div>
          <div className="callout-content">
            <strong>The problem:</strong> You have an 800-page financial document
            and want to ask &quot;What risk factors does this company have?&quot; —
            but you can&apos;t fit 800 pages into a single prompt. You need to get
            just the <em>relevant</em> information to Claude.
          </div>
        </div>

        {/* Two options + when to use RAG — conveyed by the infographic */}
        <div className="section-card">
          <h2>🛣️ Two Ways to Get Information from a Large Document</h2>
          <p className="section-subtitle">
            When you want Claude to answer questions about a large document, you
            have two options — put the whole document in the prompt, or break it
            into chunks and retrieve only what&apos;s relevant (RAG). The guide
            below compares them and shows when to reach for RAG.
          </p>
          <div className="rag-figure">
            <Image
              src="/images/rag.png"
              alt="Two ways to get information from a large document. Option 1, Include Everything: length limits, slower processing, higher cost, and less accurate with too much context. Option 2, Break into Chunks (RAG): focuses on relevant parts, scales to large documents, faster responses, and lower cost — best for large, complex documents."
              width={1408}
              height={768}
            />
          </div>
        </div>

        {/* Break documents into chunks */}
        <div className="section-card">
          <h2>📄 Break Documents into Chunks</h2>
          <p className="section-subtitle">
            RAG takes a smarter approach. First, in a preprocessing step, you break
            the document into smaller <strong>chunks</strong>. Then, when a user
            asks a question, you find the chunks most relevant to it and include
            only those in your prompt. Ask &quot;What risks does this company
            face?&quot; and you&apos;d search your chunks, find the Risk Factors
            section, and include just that chunk.
          </p>
        </div>

        {/* Chunking strategies */}
        <div className="section-card">
          <h2>✂️ Chunking Strategies</h2>
          <p className="section-subtitle">
            There&apos;s more than one way to split a document. Each trades off
            simplicity against how coherent the resulting chunks are.
          </p>
          <div className="concepts-grid">
            {CHUNK_STRATEGIES.map((strategy) => (
              <div key={strategy.id} className="concept">
                <div className="concept-title">{strategy.name}</div>
                <p>{strategy.description}</p>
                <p className="chunk-strategy-example">
                  <strong>e.g.</strong> {strategy.example}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Finding relevant chunks */}
        <div className="section-card">
          <h2>🧲 Finding the Relevant Chunks</h2>
          <p className="section-subtitle">
            After chunking, the next step is finding which chunks are most relevant
            to a question.
          </p>
          <div className="concepts-grid">
            <div className="concept">
              <div className="concept-title">Semantic Search</div>
              <p>
                Instead of matching keywords, semantic search matches{" "}
                <em>meaning</em>. A question about &quot;threats to the
                business&quot; can find a &quot;Risk Factors&quot; chunk even
                though they share no words.
              </p>
            </div>
            <div className="concept">
              <div className="concept-title">Text Embeddings</div>
              <p>
                An embeddings model converts text into a vector of numbers. Texts
                with similar meaning end up close together in vector space, so
                &quot;how near is that?&quot; becomes a math question.
              </p>
            </div>
          </div>
        </div>

        {/* The RAG flow */}
        <div className="section-card">
          <h2>🔁 The RAG Flow</h2>
          <p className="section-subtitle">
            Putting it together, a RAG pipeline runs in six steps:
          </p>
          <ol className="rag-flow-steps">
            {RAG_FLOW.map((step, i) => (
              <li key={i} className="rag-flow-step">
                <span className="rag-flow-num">{i + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Interactive demo */}
        <div className="section-card">
          <h2>🧪 Try It: Retrieve, then Answer</h2>
          <p className="section-subtitle">
            Below is a sample financial document, already split into{" "}
            {CHUNKS.length} structure-based chunks. Ask a question — the demo
            embeds every chunk and your question, ranks them by cosine similarity,
            sends the top {TOP_K} to Claude, and shows the grounded answer.
          </p>

          <div className="chunk-preview">
            {CHUNKS.map((chunk) => (
              <span key={chunk.id} className="chunk-pill">
                {chunk.heading}
              </span>
            ))}
          </div>

          <div className="control-section">
            <label>Your question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something about the document..."
              rows={2}
            />
            <div className="preset-buttons">
              {QUESTION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setQuestion(preset)}
                  className="preset-btn"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={running || !isValid}
            className="send-button"
          >
            {running ? "Retrieving..." : "Run RAG"}
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        {result && (
          <>
            <div className="section-card">
              <h2>📊 Step 5: Ranked Chunks</h2>
              <p className="section-subtitle">
                Every chunk scored by similarity to your question. The top {TOP_K}{" "}
                (highlighted) were sent to Claude as context.
                <span
                  className={`embedding-source-badge ${result.embeddingSource}`}
                >
                  {result.embeddingSource === "voyage"
                    ? "Embeddings: Voyage AI"
                    : "Embeddings: lexical fallback (no VOYAGE_API_KEY)"}
                </span>
              </p>
              <div className="results-list">
                {result.rankedChunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className={`chunk-rank-row${
                      chunk.selected ? " chunk-selected" : ""
                    }`}
                  >
                    <div className="chunk-rank-header">
                      <span className="chunk-rank-heading">
                        {chunk.selected ? "✅ " : ""}
                        {chunk.heading}
                      </span>
                      <span className="chunk-rank-score">
                        {chunk.score.toFixed(3)}
                      </span>
                    </div>
                    <div className="chunk-score-bar">
                      <div
                        className="chunk-score-fill"
                        style={{
                          width: `${Math.max(0, Math.min(1, chunk.score)) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="chunk-rank-snippet">{chunk.snippet}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-card">
              <h2>💬 Step 6: Grounded Answer</h2>
              <p className="section-subtitle">
                The final prompt — the top {TOP_K} chunks as context plus your
                question — is sent to Claude. Its answer, grounded only in those
                retrieved chunks:
              </p>
              <div className="response-content">{result.answer}</div>
            </div>
          </>
        )}

        {/* Key concepts */}
        <div className="concepts-box">
          <h3>🎯 Key Concepts</h3>
          <div className="concepts-grid">
            <div className="concept">
              <div className="concept-icon">✂️</div>
              <div className="concept-title">Chunking</div>
              <p>Break a large document into smaller, searchable pieces.</p>
            </div>
            <div className="concept">
              <div className="concept-icon">🧭</div>
              <div className="concept-title">Embeddings</div>
              <p>Turn text into vectors so similarity becomes a math problem.</p>
            </div>
            <div className="concept">
              <div className="concept-icon">🎯</div>
              <div className="concept-title">Retrieval</div>
              <p>Fetch only the top-matching chunks and put those in the prompt.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
