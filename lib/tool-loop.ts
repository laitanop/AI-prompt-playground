import type { Message, MessageParam, ToolUseBlock } from "@anthropic-ai/sdk/resources";
import { executeTool } from "./tools";

export type StepEvent =
  | { type: "user_text"; text: string }
  | { type: "assistant_text"; text: string }
  | { type: "tool_call"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; toolUseId: string; name: string; result: unknown; isError: boolean }
  | { type: "done"; reminderCreated: boolean }
  | { type: "limit_reached" }
  | { type: "stop_incomplete"; stopReason: string }
  | { type: "api_error"; message: string };

async function callToolsAPI(
  messages: MessageParam[],
  systemPrompt: string,
): Promise<Message> {
  const res = await fetch("/api/tools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, systemPrompt }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to call API");
  }

  return res.json();
}

export async function* runToolLoop(
  userMessage: string,
  systemPrompt: string,
  maxIterations: number = 6,
): AsyncGenerator<StepEvent> {
  const messages: MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  yield { type: "user_text", text: userMessage };

  let iteration = 0;
  let reminderCreated = false;

  while (iteration < maxIterations) {
    iteration++;

    let response: Message;
    try {
      response = await callToolsAPI(messages, systemPrompt);
    } catch (error) {
      yield {
        type: "api_error",
        message: error instanceof Error ? error.message : "Unknown API error",
      };
      return;
    }

    // Add assistant's response to messages
    const assistantContent = response.content;
    messages.push({ role: "assistant", content: assistantContent });

    // Process content blocks
    const toolUseBlocks: ToolUseBlock[] = [];
    let hasText = false;

    for (const block of assistantContent) {
      if (block.type === "text") {
        hasText = true;
        yield { type: "assistant_text", text: block.text };
      } else if (block.type === "tool_use") {
        toolUseBlocks.push(block);
        yield {
          type: "tool_call",
          id: block.id,
          name: block.name,
          input: (block.input || {}) as Record<string, unknown>,
        };
      }
    }

    // If stop_reason is not tool_use, we're done
    if (response.stop_reason !== "tool_use") {
      // Catch incomplete stops other than end_turn
      if (response.stop_reason !== "end_turn" && response.stop_reason) {
        yield { type: "stop_incomplete", stopReason: response.stop_reason };
      }
      yield { type: "done", reminderCreated };
      return;
    }

    // Execute all tools and collect results
    const toolResults: Array<{
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    }> = [];

    for (const toolUseBlock of toolUseBlocks) {
      try {
        const result = executeTool(
          toolUseBlock.name,
          (toolUseBlock.input || {}) as Record<string, unknown>,
        );

        if (toolUseBlock.name === "set_reminder") {
          const setReminderResult = result as { success: boolean; data?: unknown; error?: string };
          if (setReminderResult.success) {
            reminderCreated = true;
          }
        }

        yield {
          type: "tool_result",
          toolUseId: toolUseBlock.id,
          name: toolUseBlock.name,
          result,
          isError: false,
        };

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUseBlock.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        yield {
          type: "tool_result",
          toolUseId: toolUseBlock.id,
          name: toolUseBlock.name,
          result: { error: errorMessage },
          isError: true,
        };

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUseBlock.id,
          content: errorMessage,
          is_error: true,
        });
      }
    }

    // Add all tool results in a single user message
    messages.push({
      role: "user",
      content: toolResults,
    });
  }

  // Hit iteration limit
  yield { type: "limit_reached" };
}
