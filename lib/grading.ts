import type Anthropic from "@anthropic-ai/sdk";

export type OutputFormat = "boolean" | "score";

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
  pass?: boolean;
  score?: number;
  reasoning?: string;
  error?: string;
}

const JUDGE_MODEL = "claude-haiku-4-5-20251001";
const MIN_SCORE = 0;
const MAX_SCORE = 10;

const BOOLEAN_JUDGE_SYSTEM_PROMPT = `You are grading an AI assistant's response.
If grading criteria is given, judge whether the response satisfies it. If no criteria is given, judge whether the response is a good, accurate, and helpful answer overall.
Respond with ONLY a JSON object, no markdown fences, no commentary: {"pass": boolean, "reasoning": string}`;

const SCORE_JUDGE_SYSTEM_PROMPT = `You are grading an AI assistant's response.
If grading criteria is given, score how well the response satisfies it. If no criteria is given, score the overall quality, accuracy, and helpfulness of the response.
Score from ${MIN_SCORE} (poor / fails the criteria) to ${MAX_SCORE} (excellent / fully satisfies the criteria).
Respond with ONLY a JSON object, no markdown fences, no commentary: {"score": number, "reasoning": string}`;

function clampScore(score: number): number {
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, score));
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");
}

function parseBooleanJudgeResponse(text: string): { pass: boolean; reasoning: string } {
  try {
    const parsed = JSON.parse(stripFences(text));
    if (typeof parsed.pass === "boolean" && typeof parsed.reasoning === "string") {
      return parsed;
    }
    throw new Error("Judge response missing expected fields");
  } catch {
    return {
      pass: false,
      reasoning: `Judge did not return valid JSON: ${text.slice(0, 200)}`,
    };
  }
}

function parseScoreJudgeResponse(text: string): { score: number; reasoning: string } {
  try {
    const parsed = JSON.parse(stripFences(text));
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
  criteria: string | undefined,
  outputFormat: OutputFormat,
): Promise<{ pass: boolean; reasoning: string } | { score: number; reasoning: string }> {
  const criteriaLine =
    criteria && criteria.trim()
      ? `Grading criteria: ${criteria}`
      : "No grading criteria was provided — grade the overall quality, accuracy, and helpfulness of the response.";

  const judgeMessage = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 512,
    system: outputFormat === "boolean" ? BOOLEAN_JUDGE_SYSTEM_PROMPT : SCORE_JUDGE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `User message: ${input}\n\nAssistant response: ${response}\n\n${criteriaLine}`,
      },
    ],
  });

  const content = judgeMessage.content[0];
  if (content.type !== "text") {
    return outputFormat === "boolean"
      ? { pass: false, reasoning: "Judge did not return a text response" }
      : { score: MIN_SCORE, reasoning: "Judge did not return a text response" };
  }

  return outputFormat === "boolean"
    ? parseBooleanJudgeResponse(content.text)
    : parseScoreJudgeResponse(content.text);
}
