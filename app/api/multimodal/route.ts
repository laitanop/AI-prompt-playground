import { NextRequest, NextResponse } from "next/server";
import type {
  ContentBlockParam,
  Message,
  TextCitation,
} from "@anthropic-ai/sdk/resources";
import { client } from "@/lib/anthropic";
import { SAMPLE_DOCUMENT } from "@/lib/rag-document";
import {
  ALLOWED_IMAGE_TYPES,
  EFFORT_LEVELS,
  modelFor,
  type DemoId,
  type Effort,
} from "@/lib/multimodal";

const MAX_TOKENS = 16000;

interface Usage {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}

function readUsage(response: Message): Usage {
  return {
    input: response.usage.input_tokens,
    output: response.usage.output_tokens,
    cacheCreation: response.usage.cache_creation_input_tokens ?? 0,
    cacheRead: response.usage.cache_read_input_tokens ?? 0,
  };
}

function textOf(response: Message): string {
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

/** The citations demo sends the sample filing as one plain-text document. */
function documentText(): string {
  return SAMPLE_DOCUMENT.map(
    (section) => `## ${section.heading}\n\n${section.body}`,
  ).join("\n\n");
}

// --- Extended thinking ------------------------------------------------------

async function runThinking(body: Record<string, unknown>) {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "'prompt' is required" }, { status: 400 });
  }

  const thinkingEnabled = body.thinkingEnabled !== false;
  const effort = EFFORT_LEVELS.includes(body.effort as Effort)
    ? (body.effort as Effort)
    : "medium";

  const started = Date.now();
  const response = await client.messages.create({
    model: modelFor("thinking"),
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
    ...(thinkingEnabled
      ? {
          // `display: "summarized"` is the opt-in — the default on Opus 5 is
          // "omitted", which streams thinking blocks with empty text.
          thinking: { type: "adaptive" as const, display: "summarized" as const },
          output_config: { effort },
        }
      : {
          // Disabling thinking is only accepted at effort "high" or lower, so
          // we leave output_config off entirely and take the default.
          thinking: { type: "disabled" as const },
        }),
  });

  const thinking = response.content
    .filter((block) => block.type === "thinking")
    .map((block) => (block.type === "thinking" ? block.thinking : ""))
    .join("\n\n")
    .trim();

  return NextResponse.json({
    thinking,
    answer: textOf(response),
    usage: readUsage(response),
    elapsedMs: Date.now() - started,
    effort: thinkingEnabled ? effort : null,
    thinkingEnabled,
  });
}

// --- Image ------------------------------------------------------------------

async function runImage(body: Record<string, unknown>) {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const data = typeof body.imageData === "string" ? body.imageData : "";
  const mediaType = String(body.mediaType ?? "");

  if (!prompt || !data) {
    return NextResponse.json(
      { error: "'prompt' and 'imageData' are required" },
      { status: 400 },
    );
  }
  if (!ALLOWED_IMAGE_TYPES.includes(mediaType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return NextResponse.json(
      { error: `Unsupported image type: ${mediaType || "(none)"}` },
      { status: 400 },
    );
  }

  const started = Date.now();
  const response = await client.messages.create({
    model: modelFor("image"),
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as (typeof ALLOWED_IMAGE_TYPES)[number],
              data,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  return NextResponse.json({
    answer: textOf(response),
    usage: readUsage(response),
    elapsedMs: Date.now() - started,
  });
}

// --- PDF --------------------------------------------------------------------

async function runPdf(body: Record<string, unknown>) {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const data = typeof body.pdfData === "string" ? body.pdfData : "";

  if (!prompt || !data) {
    return NextResponse.json(
      { error: "'prompt' and 'pdfData' are required" },
      { status: 400 },
    );
  }

  const started = Date.now();
  const response = await client.messages.create({
    model: modelFor("pdf"),
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: "user",
        content: [
          // The document block goes before the text block — Claude reads the
          // source material first, then the instruction about it.
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  return NextResponse.json({
    answer: textOf(response),
    usage: readUsage(response),
    elapsedMs: Date.now() - started,
  });
}

// --- Citations --------------------------------------------------------------

interface CitedSpan {
  citedText: string;
  documentTitle: string | null;
  startCharIndex: number | null;
  endCharIndex: number | null;
}

interface AnswerBlock {
  text: string;
  citations: CitedSpan[];
}

function normaliseCitation(citation: TextCitation): CitedSpan {
  // TextCitation is a union across location kinds (char, page, content block,
  // web search result). Only the document-backed variants carry a title and
  // char offsets, so read them defensively rather than narrowing on `type`.
  const loose = citation as Partial<{
    document_title: string | null;
    start_char_index: number;
    end_char_index: number;
  }>;
  return {
    citedText: citation.cited_text,
    documentTitle: loose.document_title ?? null,
    startCharIndex: loose.start_char_index ?? null,
    endCharIndex: loose.end_char_index ?? null,
  };
}

async function runCitations(body: Record<string, unknown>) {
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json(
      { error: "'question' is required" },
      { status: 400 },
    );
  }

  const citationsEnabled = body.citationsEnabled !== false;
  const source = documentText();

  const content: ContentBlockParam[] = [
    {
      type: "document",
      source: { type: "text", media_type: "text/plain", data: source },
      title: "Northwind Robotics — Annual Report Excerpt",
      // Citations are all-or-nothing across the document blocks in a request.
      citations: { enabled: citationsEnabled },
    },
    { type: "text", text: question },
  ];

  const started = Date.now();
  const response = await client.messages.create({
    model: modelFor("citations"),
    max_tokens: MAX_TOKENS,
    system:
      "Answer using only the attached document. Keep the answer to a short paragraph.",
    messages: [{ role: "user", content }],
  });

  // With citations on, the response splits into several text blocks: the cited
  // ones carry a `citations` array, the connective tissue between them doesn't.
  const blocks: AnswerBlock[] = response.content
    .filter((block) => block.type === "text")
    .map((block) => {
      if (block.type !== "text") return { text: "", citations: [] };
      return {
        text: block.text,
        citations: (block.citations ?? []).map(normaliseCitation),
      };
    });

  return NextResponse.json({
    blocks,
    documentText: source,
    citationsEnabled,
    usage: readUsage(response),
    elapsedMs: Date.now() - started,
  });
}

// --- Router -----------------------------------------------------------------

const HANDLERS: Record<
  DemoId,
  (body: Record<string, unknown>) => Promise<NextResponse>
> = {
  thinking: runThinking,
  image: runImage,
  pdf: runPdf,
  citations: runCitations,
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const demo = body.demo as DemoId;
    const handler = HANDLERS[demo];

    if (!handler) {
      return NextResponse.json(
        { error: `Unknown demo: ${String(demo)}` },
        { status: 400 },
      );
    }

    return await handler(body);
  } catch (error) {
    console.error("Multimodal API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
