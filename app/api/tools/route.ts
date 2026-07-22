import { NextRequest, NextResponse } from "next/server";
import type { MessageParam } from "@anthropic-ai/sdk/resources";
import { client } from "@/lib/anthropic";
import { TOOL_DEFINITIONS } from "@/lib/tools";

const MODEL = "claude-haiku-4-5-20251001";

function validate(body: unknown): {
  messages: MessageParam[];
  systemPrompt: string;
} | null {
  if (typeof body !== "object" || body === null) return null;
  const { messages, systemPrompt } = body as Record<string, unknown>;

  if (!Array.isArray(messages) || messages.length === 0) return null;
  if (typeof systemPrompt !== "string" || !systemPrompt.trim()) return null;

  return { messages: messages as MessageParam[], systemPrompt };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validate(body);

    if (!validated) {
      return NextResponse.json(
        { error: "Invalid request: check messages and systemPrompt" },
        { status: 400 },
      );
    }

    const { messages, systemPrompt } = validated;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      messages,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Tools API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
