import type Anthropic from "@anthropic-ai/sdk";

export interface TestCase {
  id: string;
  input: string;
  criteria?: string;
}

export interface EvalResult {
  id: string;
  input: string;
  criteria?: string;
  response?: string;
  score?: number;
  reasoning?: string;
  error?: string;
}

const JUDGE_MODEL = "claude-haiku-4-5-20251001";
const MIN_SCORE = 0;
const MAX_SCORE = 10;

const JUDGE_SYSTEM_PROMPT = `You are grading an AI assistant's response.
If grading criteria is given, score how well the response satisfies it. If no criteria is given, score the overall quality, accuracy, and helpfulness of the response.
Score from ${MIN_SCORE} (poor / fails the criteria) to ${MAX_SCORE} (excellent / fully satisfies the criteria).
Respond with ONLY a JSON object, no markdown fences, no commentary: {"score": number, "reasoning": string}`;

function clampScore(score: number): number {
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, score));
}

function parseJudgeResponse(text: string): { score: number; reasoning: string } {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");

  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.score === "number" && Number.isFinite(parsed.score) && typeof parsed.reasoning === "string") {
      return { score: clampScore(parsed.score), reasoning: parsed.reasoning };
    }
    throw new Error("Judge response missing expected fields");
  } catch {
    return {
      score: MIN_SCORE,
      reasoning: `Judge did not return valid JSON: ${text.slice(0, 200)}`,
    };
  }
}

export async function gradeResponse(
  client: Anthropic,
  input: string,
  response: string,
  criteria?: string,
): Promise<{ score: number; reasoning: string }> {
  const criteriaLine =
    criteria && criteria.trim()
      ? `Grading criteria: ${criteria}`
      : "No grading criteria was provided — grade the overall quality, accuracy, and helpfulness of the response.";

  const judgeMessage = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 512,
    system: JUDGE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `User message: ${input}\n\nAssistant response: ${response}\n\n${criteriaLine}`,
      },
    ],
  });

  const content = judgeMessage.content[0];
  if (content.type !== "text") {
    return { score: MIN_SCORE, reasoning: "Judge did not return a text response" };
  }

  return parseJudgeResponse(content.text);
}
