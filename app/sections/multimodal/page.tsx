"use client";

import { useRef, useState } from "react";
import SectionNav from "@/components/SectionNav";
import {
  ALLOWED_IMAGE_TYPES,
  CITATION_PRESETS,
  EFFORT_LEVELS,
  IMAGE_PRESETS,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  modelFor,
  OPUS,
  PDF_PRESETS,
  SUB_SECTIONS,
  THINKING_PRESETS,
  type DemoId,
  type Effort,
} from "@/lib/multimodal";

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

interface Usage {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}

async function postDemo<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/multimodal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

/** Reads a File into the bare base64 string the Messages API expects. */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CodeBlock({ children }: { children: string }) {
  return <pre className="mm-code">{children}</pre>;
}

function UsageBar({ usage, elapsedMs }: { usage: Usage; elapsedMs?: number }) {
  return (
    <div className="mm-usage">
      <span>
        <strong>{usage.input.toLocaleString()}</strong> input
      </span>
      <span>
        <strong>{usage.output.toLocaleString()}</strong> output
      </span>
      {usage.cacheCreation > 0 && (
        <span>
          <strong>{usage.cacheCreation.toLocaleString()}</strong> cache write
        </span>
      )}
      {usage.cacheRead > 0 && (
        <span>
          <strong>{usage.cacheRead.toLocaleString()}</strong> cache read
        </span>
      )}
      {elapsedMs !== undefined && (
        <span>
          <strong>{(elapsedMs / 1000).toFixed(1)}s</strong> elapsed
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Extended thinking                                                          */
/* -------------------------------------------------------------------------- */

interface ThinkingResult {
  thinking: string;
  answer: string;
  usage: Usage;
  elapsedMs: number;
  effort: Effort | null;
  thinkingEnabled: boolean;
}

function ThinkingPanel() {
  const [prompt, setPrompt] = useState(THINKING_PRESETS[0].prompt);
  const [effort, setEffort] = useState<Effort>("medium");
  const [enabled, setEnabled] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ThinkingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await postDemo<ThinkingResult>({
          demo: "thinking",
          prompt,
          effort,
          thinkingEnabled: enabled,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div className="section-card">
        <h2>🧠 What Extended Thinking Does</h2>
        <p className="section-subtitle">
          Without thinking, Claude&apos;s very first output token is already
          part of the answer — there is nowhere to work the problem out.
          Extended thinking gives the model a private scratchpad it fills in
          before it starts responding. You see a summary of that reasoning in{" "}
          <code>thinking</code> blocks; the answer arrives afterwards in the
          usual <code>text</code> blocks.
        </p>

        <div className="concepts-grid">
          <div className="concept">
            <div className="concept-title">Adaptive, not budgeted</div>
            <p>
              You no longer hand Claude a fixed token budget. With{" "}
              <code>type: &quot;adaptive&quot;</code> it decides per request how
              much thinking the problem actually warrants.
            </p>
          </div>
          <div className="concept">
            <div className="concept-title">Effort is the dial</div>
            <p>
              <code>effort</code> — <code>low</code> through <code>max</code> —
              controls how deep it goes and how much it spends. Low is great for
              lookups; xhigh suits hard coding and agentic work.
            </p>
          </div>
          <div className="concept">
            <div className="concept-title">Display is opt-in</div>
            <p>
              Thinking blocks are returned either way, but their text is empty
              unless you ask for <code>display: &quot;summarized&quot;</code>.
              The raw chain of thought is never exposed.
            </p>
          </div>
        </div>

        <CodeBlock>{`const response = await client.messages.create({
  model: "${modelFor("thinking")}",
  max_tokens: 16000,
  thinking: { type: "adaptive", display: "summarized" },
  output_config: { effort: "medium" },   // low | medium | high | xhigh | max
  messages: [{ role: "user", content: prompt }],
});

// The response now has two kinds of block:
const thinking = response.content.filter((b) => b.type === "thinking");
const answer   = response.content.filter((b) => b.type === "text");`}</CodeBlock>

        <div className="learning-callout">
          <div className="callout-icon">⚠️</div>
          <div className="callout-content">
            <strong>Budget your max_tokens for both.</strong>{" "}
            <code>max_tokens</code> caps thinking <em>plus</em> the response. On
            Opus 5 thinking is on by default, so a request sized tightly around
            its answer can now truncate mid-sentence.
          </div>
        </div>
      </div>

      <div className="section-card">
        <h2>🧪 Try It: Same Question, With and Without Thinking</h2>
        <p className="section-subtitle">
          Each preset has a trap in it. Run one with thinking off, then again
          with it on, and compare both the answer and the token counts.
        </p>

        <div className="control-section">
          <label>Problem</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
          />
          <div className="preset-buttons">
            {THINKING_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setPrompt(preset.prompt)}
                className="preset-btn"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mm-controls-row">
          <label className="mm-switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Extended thinking {enabled ? "on" : "off"}</span>
          </label>

          <div className="mm-effort">
            <span className="mm-effort-label">Effort</span>
            {EFFORT_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setEffort(level)}
                disabled={!enabled}
                className={`mm-effort-btn${effort === level ? " selected" : ""}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        {!enabled && (
          <p className="mm-hint">
            Effort is disabled here on purpose: pairing{" "}
            <code>
              thinking: {"{"} type: &quot;disabled&quot; {"}"}
            </code>{" "}
            with <code>xhigh</code> or <code>max</code> is a 400 on Opus 5, so
            this demo omits <code>output_config</code> entirely when thinking is
            off.
          </p>
        )}

        <button
          onClick={run}
          disabled={running || !prompt.trim()}
          className="send-button"
        >
          {running ? "Thinking..." : "Run"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {result && (
        <>
          {result.thinkingEnabled && (
            <div className="section-card">
              <h2>💭 Thinking Blocks</h2>
              <p className="section-subtitle">
                Summarised reasoning at effort <code>{result.effort}</code>.
                This is billed as output, and it is what the answer below is
                built on.
              </p>
              <div className="mm-thinking">
                {result.thinking || (
                  <em>
                    Claude decided this question didn&apos;t need thinking —
                    adaptive means it can spend nothing at all.
                  </em>
                )}
              </div>
            </div>
          )}

          <div className="section-card">
            <h2>💬 Answer</h2>
            <p className="section-subtitle">
              {result.thinkingEnabled
                ? "Produced after the reasoning above."
                : "Produced with thinking disabled — no scratchpad."}
            </p>
            <div className="response-content">{result.answer}</div>
            <UsageBar usage={result.usage} elapsedMs={result.elapsedMs} />
          </div>
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Image support                                                              */
/* -------------------------------------------------------------------------- */

interface MediaResult {
  answer: string;
  usage: Usage;
  elapsedMs: number;
}

function ImagePanel() {
  const [prompt, setPrompt] = useState(IMAGE_PRESETS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MediaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (picked: File | null) => {
    setError(null);
    setResult(null);
    if (!picked) return;
    if (!ALLOWED_IMAGE_TYPES.includes(picked.type as never)) {
      setError(`Unsupported type ${picked.type}. Use JPEG, PNG, GIF, or WebP.`);
      return;
    }
    if (picked.size > MAX_IMAGE_BYTES) {
      setError(
        `That image is ${formatBytes(picked.size)}. This demo caps uploads at ${formatBytes(MAX_IMAGE_BYTES)}.`,
      );
      return;
    }
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
  };

  const run = async () => {
    if (!file) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const imageData = await readAsBase64(file);
      setResult(
        await postDemo<MediaResult>({
          demo: "image",
          prompt,
          imageData,
          mediaType: file.type,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div className="section-card">
        <h2>🖼️ How Images Reach Claude</h2>
        <p className="section-subtitle">
          An image is just another content block inside a user message. You can
          mix as many images and text blocks as you like in one turn, which is
          what makes &quot;compare these two screenshots&quot; a single request
          rather than a pipeline.
        </p>

        <CodeBlock>{`messages: [{
  role: "user",
  content: [
    { type: "image",
      source: { type: "base64", media_type: "image/png", data: base64String } },
    { type: "text", text: "What's in this image?" },
  ],
}]

// Or skip the upload entirely and point at a URL:
// source: { type: "url", url: "https://example.com/chart.png" }`}</CodeBlock>

        <div className="concepts-grid">
          <div className="concept">
            <div className="concept-title">Three source types</div>
            <p>
              <code>base64</code> for local files, <code>url</code> for anything
              already on the web, and <code>file</code> for an ID you uploaded
              to the Files API and want to reuse across requests.
            </p>
          </div>
          <div className="concept">
            <div className="concept-title">Resolution costs tokens</div>
            <p>
              Haiku 4.5 caps the long edge at 1568px. Opus 5 and Sonnet 5 take
              2576px and can spend ~4,800 tokens on a single image — downsample
              first if you don&apos;t need that fidelity.
            </p>
          </div>
          <div className="concept">
            <div className="concept-title">Order matters</div>
            <p>
              Put the image before the question. Claude reads content blocks in
              order, so it sees the material first and the instruction second.
            </p>
          </div>
        </div>
      </div>

      <div className="section-card">
        <h2>🧪 Try It: Upload an Image</h2>
        <p className="section-subtitle">
          JPEG, PNG, GIF, or WebP, up to {formatBytes(MAX_IMAGE_BYTES)}. The
          file is base64-encoded in your browser and sent through this
          app&apos;s server route — it is never stored.
        </p>

        <div className="mm-dropzone">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            hidden
          />
          {previewUrl ? (
            // Blob URL of a user-selected file — next/image can't optimise it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected upload"
              className="mm-preview"
            />
          ) : (
            <div className="mm-dropzone-empty">🖼️</div>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            className="preset-btn"
          >
            {file ? "Choose a different image" : "Choose an image"}
          </button>
          {file && (
            <span className="mm-filemeta">
              {file.name} · {formatBytes(file.size)} · {file.type}
            </span>
          )}
        </div>

        <div className="control-section">
          <label>Question about the image</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
          />
          <div className="preset-buttons">
            {IMAGE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setPrompt(preset)}
                className="preset-btn"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={run}
          disabled={running || !file || !prompt.trim()}
          className="send-button"
        >
          {running ? "Looking..." : "Ask about this image"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {result && (
        <div className="section-card">
          <h2>💬 Response</h2>
          <div className="response-content">{result.answer}</div>
          <UsageBar usage={result.usage} elapsedMs={result.elapsedMs} />
          <p className="mm-hint">
            Notice how large the input count is relative to your question —
            that&apos;s the image.
          </p>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* PDF support                                                                */
/* -------------------------------------------------------------------------- */

function PdfPanel() {
  const [prompt, setPrompt] = useState(PDF_PRESETS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MediaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (picked: File | null) => {
    setError(null);
    setResult(null);
    if (!picked) return;
    if (picked.type !== "application/pdf") {
      setError("That isn't a PDF. Pick a file with an application/pdf type.");
      return;
    }
    if (picked.size > MAX_PDF_BYTES) {
      setError(
        `That PDF is ${formatBytes(picked.size)}. This demo caps uploads at ${formatBytes(MAX_PDF_BYTES)}.`,
      );
      return;
    }
    setFile(picked);
  };

  const run = async () => {
    if (!file) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const pdfData = await readAsBase64(file);
      setResult(await postDemo<MediaResult>({ demo: "pdf", prompt, pdfData }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div className="section-card">
        <h2>📄 PDFs Are Read, Not Just Parsed</h2>
        <p className="section-subtitle">
          A <code>document</code> block sends the PDF itself. Claude reads the
          extracted text <em>and</em> looks at each page as an image, so tables,
          multi-column layouts, charts, and handwritten annotations all survive
          — the things a plain text extractor throws away.
        </p>

        <CodeBlock>{`messages: [{
  role: "user",
  content: [
    { type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64Pdf } },
    { type: "text", text: "Summarise this document in five bullet points." },
  ],
}]`}</CodeBlock>

        <div className="concepts-grid">
          <div className="concept">
            <div className="concept-title">Limits to know</div>
            <p>
              32 MB per request and 600 pages on a 1M-context model (100 pages
              on 200K models). The base64 string must have no newlines in it.
            </p>
          </div>
          <div className="concept">
            <div className="concept-title">Both modalities are billed</div>
            <p>
              Each page costs text tokens for its content plus image tokens for
              its rendering. A long PDF is a real chunk of your context window.
            </p>
          </div>
          <div className="concept">
            <div className="concept-title">Reuse via the Files API</div>
            <p>
              Uploading once and referencing{" "}
              <code>
                source: {"{"} type: &quot;file&quot;, file_id {"}"}
              </code>{" "}
              beats re-encoding the same PDF on every request.
            </p>
          </div>
        </div>
      </div>

      <div className="section-card">
        <h2>🧪 Try It: Upload a PDF</h2>
        <p className="section-subtitle">
          Up to {formatBytes(MAX_PDF_BYTES)}. Something with a table or a chart
          in it makes the point best.
        </p>

        <div className="mm-dropzone">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            hidden
          />
          <div className="mm-dropzone-empty">{file ? "📕" : "📄"}</div>
          <button
            onClick={() => inputRef.current?.click()}
            className="preset-btn"
          >
            {file ? "Choose a different PDF" : "Choose a PDF"}
          </button>
          {file && (
            <span className="mm-filemeta">
              {file.name} · {formatBytes(file.size)}
            </span>
          )}
        </div>

        <div className="control-section">
          <label>Question about the document</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
          />
          <div className="preset-buttons">
            {PDF_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setPrompt(preset)}
                className="preset-btn"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={run}
          disabled={running || !file || !prompt.trim()}
          className="send-button"
        >
          {running ? "Reading..." : "Ask about this PDF"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {result && (
        <div className="section-card">
          <h2>💬 Response</h2>
          <div className="response-content">{result.answer}</div>
          <UsageBar usage={result.usage} elapsedMs={result.elapsedMs} />
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Citations                                                                  */
/* -------------------------------------------------------------------------- */

interface CitedSpan {
  citedText: string;
  documentTitle: string | null;
  startCharIndex: number | null;
  endCharIndex: number | null;
}

interface CitationsResult {
  blocks: { text: string; citations: CitedSpan[] }[];
  documentText: string;
  citationsEnabled: boolean;
  usage: Usage;
  elapsedMs: number;
}

/** A citation plus its footnote number and the answer block it belongs to. */
interface NumberedCitation extends CitedSpan {
  n: number;
  blockIndex: number;
}

interface DocSegment {
  text: string;
  /** Footnote numbers of every citation covering this segment (empty = uncited). */
  ns: number[];
}

/**
 * Splits the source document at every cited boundary, tagging each resulting
 * segment with the citations that cover it. Handles overlapping spans, which
 * happen when Claude cites two claims that share source text.
 */
function sliceAtCitations(
  text: string,
  cites: NumberedCitation[],
): DocSegment[] {
  const spans = cites.filter(
    (c) => c.startCharIndex !== null && c.endCharIndex !== null,
  );
  if (spans.length === 0) return [{ text, ns: [] }];

  // Every span edge becomes a cut point; segments between cuts are uniform.
  const cuts = new Set<number>([0, text.length]);
  for (const s of spans) {
    cuts.add(Math.max(0, Math.min(text.length, s.startCharIndex!)));
    cuts.add(Math.max(0, Math.min(text.length, s.endCharIndex!)));
  }
  const sorted = [...cuts].sort((a, b) => a - b);

  const segments: DocSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    if (from === to) continue;
    segments.push({
      text: text.slice(from, to),
      ns: spans
        .filter((s) => s.startCharIndex! <= from && s.endCharIndex! >= to)
        .map((s) => s.n),
    });
  }
  return segments;
}

function CitationsPanel() {
  const [question, setQuestion] = useState(CITATION_PRESETS[0]);
  const [enabled, setEnabled] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CitationsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setActive(null);
    try {
      setResult(
        await postDemo<CitationsResult>({
          demo: "citations",
          question,
          citationsEnabled: enabled,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRunning(false);
    }
  };

  // Flatten every citation across blocks so each gets a stable footnote number,
  // and remember which answer block it came from so the two views can link up.
  const cites: NumberedCitation[] = result
    ? result.blocks.flatMap((block, blockIndex) =>
        block.citations.map((citation) => ({ ...citation, blockIndex, n: 0 })),
      )
    : [];
  cites.forEach((c, i) => (c.n = i + 1));

  // Which citation numbers belong to each answer block.
  const numbersByBlock = new Map<number, number[]>();
  for (const c of cites) {
    numbersByBlock.set(c.blockIndex, [
      ...(numbersByBlock.get(c.blockIndex) ?? []),
      c.n,
    ]);
  }

  // The source document, sliced at every cited boundary so the exact spans can
  // be highlighted in place. This is what the character offsets are *for*.
  const segments = result ? sliceAtCitations(result.documentText, cites) : [];

  const focus = (n: number, where: "ans" | "src") => {
    setActive(n);
    document
      .getElementById(`mm-${where}-${n}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      <div className="section-card">
        <h2>🔗 Citations Turn Claims into Receipts</h2>
        <p className="section-subtitle">
          RAG gets the right passages into the prompt. Citations close the loop:
          set one flag on a <code>document</code> block and Claude attaches the
          exact source span behind each sentence it writes. You get back the
          quoted text and its character offsets, so you can highlight the source
          in your own UI.
        </p>

        <CodeBlock>{`content: [
  { type: "document",
    source: { type: "text", media_type: "text/plain", data: sourceText },
    title: "Annual Report Excerpt",
    citations: { enabled: true } },      // <- the whole feature
  { type: "text", text: question },
]

// The answer now arrives as several text blocks. Cited ones carry spans:
for (const block of response.content) {
  if (block.type !== "text") continue;
  for (const c of block.citations ?? []) {
    console.log(c.cited_text, c.start_char_index, c.end_char_index);
  }
}`}</CodeBlock>

        <div className="concepts-grid">
          <div className="concept">
            <div className="concept-title">All or nothing</div>
            <p>
              Every <code>document</code> block in a request must agree — you
              can&apos;t cite one source and not another in the same call.
            </p>
          </div>
          <div className="concept">
            <div className="concept-title">Location varies by source</div>
            <p>
              Plain text gives <code>char_location</code>; PDFs give{" "}
              <code>page_location</code> with 1-indexed page numbers; custom
              content gives <code>content_block_location</code>.
            </p>
          </div>
          <div className="concept">
            <div className="concept-title">Not compatible with JSON output</div>
            <p>
              Citations and <code>output_config.format</code> can&apos;t be used
              together — that combination returns a 400.
            </p>
          </div>
        </div>
      </div>

      <div className="section-card">
        <h2>🧪 Try It: Cited Answers over a Filing</h2>
        <p className="section-subtitle">
          The same Northwind Robotics excerpt from the RAG section is attached
          as one plain-text document. Toggle citations off to see the same
          answer with nothing to verify it against.
        </p>

        <div className="control-section">
          <label>Your question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
          />
          <div className="preset-buttons">
            {CITATION_PRESETS.map((preset) => (
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

        <div className="mm-controls-row">
          <label className="mm-switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Citations {enabled ? "enabled" : "disabled"}</span>
          </label>
        </div>

        <button
          onClick={run}
          disabled={running || !question.trim()}
          className="send-button"
        >
          {running ? "Answering..." : "Ask the document"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {result && (
        <>
          {/* 1. The answer, with cited spans highlighted and numbered. */}
          <div className="section-card">
            <h2>💬 Step 1: The Answer</h2>
            <p className="section-subtitle">
              {result.citationsEnabled
                ? "Yellow spans are cited — click any one to jump to that exact text inside the source document below. Unhighlighted text has no source behind it."
                : "Citations were off, so the response is one plain text block with nothing to verify it against."}
            </p>
            <div className="response-content mm-cited-answer">
              {result.blocks.map((block, i) => {
                const ns = numbersByBlock.get(i);
                if (!ns) return <span key={i}>{block.text}</span>;
                return (
                  <span
                    key={i}
                    id={`mm-ans-${ns[0]}`}
                    className={`mm-cited${ns.includes(active ?? -1) ? " active" : ""}`}
                    onClick={() => focus(ns[0], "src")}
                    title="Click to find this in the source document"
                  >
                    {block.text}
                    {ns.map((n) => (
                      <sup key={n} className="mm-cite-marker">
                        {n}
                      </sup>
                    ))}
                  </span>
                );
              })}
            </div>
            <UsageBar usage={result.usage} elapsedMs={result.elapsedMs} />
          </div>

          {/* 2. How the answer was split up — the part that makes it click. */}
          {result.citationsEnabled && (
            <div className="section-card">
              <h2>🧩 Step 2: One Answer, Several Blocks</h2>
              <p className="section-subtitle">
                Without citations you get a single <code>text</code> block. With
                them on, Claude splits the answer so each <em>claim</em> can be
                tagged separately. Rows with no citation are Claude&apos;s own
                connective or interpretive language — nothing in the document
                says them.
              </p>
              <div className="mm-blocks-scroll">
                <table className="mm-blocks">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Claude&apos;s text</th>
                      <th>Citation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.blocks.map((block, i) => {
                      const ns = numbersByBlock.get(i);
                      return (
                        <tr key={i} className={ns ? "cited" : "uncited"}>
                          <td className="mm-blocks-idx">{i}</td>
                          <td>{block.text}</td>
                          <td>
                            {ns ? (
                              ns.map((n) => {
                                const c = cites.find((x) => x.n === n)!;
                                return (
                                  <button
                                    key={n}
                                    className="mm-cite-chip"
                                    onClick={() => focus(n, "src")}
                                  >
                                    {n} · chars {c.startCharIndex}–
                                    {c.endCharIndex}
                                  </button>
                                );
                              })
                            ) : (
                              <span className="mm-blocks-none">
                                none — model&apos;s own words
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. The source document with the cited ranges highlighted in place. */}
          {cites.length > 0 && (
            <div className="section-card">
              <h2>📄 Step 3: The Source, Highlighted In Place</h2>
              <p className="section-subtitle">
                This is the actual document that was attached to the request.
                Every highlight below was located using nothing but the{" "}
                <code>start_char_index</code> and <code>end_char_index</code>{" "}
                Claude returned — that is what the offsets are for, and it&apos;s
                how you&apos;d highlight a source in your own product.
              </p>
              <div className="mm-source-doc">
                {segments.map((seg, i) =>
                  seg.ns.length === 0 ? (
                    <span key={i}>{seg.text}</span>
                  ) : (
                    <mark
                      key={i}
                      id={`mm-src-${seg.ns[0]}`}
                      className={`mm-src-hit${seg.ns.includes(active ?? -1) ? " active" : ""}`}
                      onClick={() => focus(seg.ns[0], "ans")}
                      title="Click to jump back to the answer"
                    >
                      <sup className="mm-cite-marker">{seg.ns.join(",")}</sup>
                      {seg.text}
                    </mark>
                  ),
                )}
              </div>
              <p className="mm-hint">
                Click a highlight to jump back up to the sentence it supports.
              </p>
            </div>
          )}

          {/* 4. The raw shape, for anyone who wants to build against it. */}
          {cites.length > 0 && (
            <div className="section-card">
              <h2>{"{ }"} Step 4: What the API Actually Returned</h2>
              <p className="section-subtitle">
                The <code>citations</code> array from the first cited block. This
                is the whole data structure — no parsing of Claude&apos;s prose
                required.
              </p>
              <CodeBlock>
                {JSON.stringify(
                  result.blocks.find((b) => b.citations.length > 0)?.citations,
                  null,
                  2,
                )}
              </CodeBlock>
            </div>
          )}

          {result.citationsEnabled && cites.length === 0 && (
            <div className="learning-callout">
              <div className="callout-icon">🤔</div>
              <div className="callout-content">
                Citations were enabled but nothing came back cited — usually a
                sign the document doesn&apos;t actually answer the question, so
                there was no span to point at.
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

const PANELS: Record<DemoId, () => React.JSX.Element> = {
  thinking: ThinkingPanel,
  image: ImagePanel,
  pdf: PdfPanel,
  citations: CitationsPanel,
};

export default function MultimodalPage() {
  const [active, setActive] = useState<DemoId>("thinking");
  const Panel = PANELS[active];
  const current = SUB_SECTIONS.find((s) => s.id === active)!;

  return (
    <main>
      <div className="container">
        <SectionNav />
        <header>
          <h1>🎛️ Section 5: Multimodal &amp; Advanced Features</h1>
          <p>
            Four capabilities that sit on top of the same{" "}
            <code>messages.create()</code> call you already know — reasoning,
            images, PDFs, and citations. Each is a parameter or a content block,
            not a separate API.
          </p>
        </header>

        <div className="learning-callout">
          <div className="callout-icon">💡</div>
          <div className="callout-content">
            <strong>
              These features are model-gated, so the model varies.
            </strong>{" "}
            Images, PDFs, and citations behave identically on Haiku 4.5, so they
            stay on the course&apos;s default model. Extended thinking needs
            Opus 5 — Haiku rejects adaptive thinking and the effort parameter
            with a 400. Each sub-section says which model it calls and why.
          </div>
        </div>

        {/* Sub-section overview */}
        <div className="section-card">
          <h2>🗺️ What&apos;s in This Section</h2>
          <p className="section-subtitle">
            Pick a sub-section below. Each one explains the problem it solves,
            shows the exact request shape, and gives you something to run.
          </p>
          <div className="mm-overview">
            {SUB_SECTIONS.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActive(sub.id)}
                className={`mm-overview-card${active === sub.id ? " active" : ""}`}
              >
                <span className="mm-overview-emoji">{sub.emoji}</span>
                <span className="mm-overview-title">{sub.title}</span>
                <span className="mm-overview-tagline">{sub.tagline}</span>
                <span
                  className={`mm-model-badge${sub.model === OPUS ? " opus" : ""}`}
                >
                  {sub.model === OPUS ? "Opus 5" : "Haiku 4.5"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sub-section tabs */}
        <div className="mm-tabs">
          {SUB_SECTIONS.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActive(sub.id)}
              className={`mm-tab${active === sub.id ? " active" : ""}`}
            >
              {sub.emoji} {sub.title}
            </button>
          ))}
        </div>

        <div className="learning-callout mm-problem">
          <div className="callout-icon">🎯</div>
          <div className="callout-content">
            <strong>The problem:</strong> {current.problem}
            <div className="mm-model-note">
              <span
                className={`mm-model-badge${current.model === OPUS ? " opus" : ""}`}
              >
                {current.model}
              </span>
              <span>{current.modelReason}</span>
            </div>
          </div>
        </div>

        <Panel />

        {/* Key concepts */}
        <div className="concepts-box">
          <h3>🎯 Key Concepts</h3>
          <div className="concepts-grid">
            <div className="concept">
              <div className="concept-icon">🧠</div>
              <div className="concept-title">Adaptive Thinking</div>
              <p>Claude decides how much to reason; effort sets the ceiling.</p>
            </div>
            <div className="concept">
              <div className="concept-icon">🧩</div>
              <div className="concept-title">Content Blocks</div>
              <p>
                Images and documents are blocks in a message, mixable with text.
              </p>
            </div>
            <div className="concept">
              <div className="concept-icon">🔗</div>
              <div className="concept-title">Verifiable Answers</div>
              <p>Citations return the exact source span behind each claim.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
