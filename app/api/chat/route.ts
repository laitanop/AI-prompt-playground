import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  try {
    const { message, systemPrompt, temperature, stream } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const temp = Math.max(0, Math.min(1, temperature ?? 1));

    if (stream) {
      // Streaming response
      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        async start(controller) {
          try {
            const messageStream = client.messages.stream({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 1024,
              system: systemPrompt || "You are a helpful assistant.",
              temperature: temp,
              messages: [
                {
                  role: "user",
                  content: message,
                },
              ],
            });

            for await (const event of messageStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                const data = {
                  text: event.delta.text,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n`));
              }
            }

            const finalMessage = await messageStream.finalMessage();
            const tokenData = {
              tokens: {
                input: finalMessage.usage.input_tokens,
                output: finalMessage.usage.output_tokens,
              },
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(tokenData)}\n`));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new NextResponse(customStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // Non-streaming response
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt || "You are a helpful assistant.",
        temperature: temp,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      return NextResponse.json({
        message: content.text,
        tokens: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 },
    );
  }
}
