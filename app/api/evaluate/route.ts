import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/anthropic";
import {
  gradeResponse,
  type EvalResult,
  type OutputFormat,
  type TestCase,
} from "@/lib/grading";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TEST_CASES = 20;

function validate(body: unknown): {
  systemPrompt: string;
  outputFormat: OutputFormat;
  testCases: TestCase[];
} | null {
  if (typeof body !== "object" || body === null) return null;
  const { systemPrompt, outputFormat, testCases } = body as Record<string, unknown>;

  if (typeof systemPrompt !== "string" || !systemPrompt.trim()) return null;
  if (outputFormat !== "boolean" && outputFormat !== "score") return null;
  if (!Array.isArray(testCases) || testCases.length < 1 || testCases.length > MAX_TEST_CASES) {
    return null;
  }

  for (const tc of testCases) {
    if (
      typeof tc !== "object" ||
      tc === null ||
      typeof (tc as TestCase).id !== "string" ||
      typeof (tc as TestCase).input !== "string" ||
      !(tc as TestCase).input.trim() ||
      ((tc as TestCase).criteria !== undefined && typeof (tc as TestCase).criteria !== "string")
    ) {
      return null;
    }
  }

  return { systemPrompt, outputFormat, testCases: testCases as TestCase[] };
}

async function runTestCase(
  systemPrompt: string,
  outputFormat: OutputFormat,
  testCase: TestCase,
): Promise<EvalResult> {
  const { id, input, criteria } = testCase;

  let response: string;
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: input }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }
    response = content.text;
  } catch (error) {
    return {
      id,
      input,
      criteria,
      error: error instanceof Error ? error.message : "Failed to get response",
    };
  }

  try {
    const grade = await gradeResponse(client, input, response, criteria, outputFormat);
    return { id, input, criteria, response, ...grade };
  } catch (error) {
    const reasoning = `Grading failed: ${error instanceof Error ? error.message : "unknown error"}`;
    return outputFormat === "boolean"
      ? { id, input, criteria, response, pass: false, reasoning }
      : { id, input, criteria, response, score: 0, reasoning };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validate(body);

    if (!validated) {
      return NextResponse.json(
        { error: "Invalid request: check systemPrompt, outputFormat, and testCases" },
        { status: 400 },
      );
    }

    const { systemPrompt, outputFormat, testCases } = validated;

    const results = await Promise.all(
      testCases.map((tc) => runTestCase(systemPrompt, outputFormat, tc)),
    );

    const summary =
      outputFormat === "boolean"
        ? { total: results.length, passed: results.filter((r) => r.pass).length }
        : {
            total: results.length,
            average:
              results.length > 0
                ? results.reduce((sum, r) => sum + (r.score ?? 0), 0) / results.length
                : 0,
          };

    return NextResponse.json({ results, summary });
  } catch (error) {
    console.error("Evaluate API error:", error);
    return NextResponse.json(
      { error: "Failed to process evaluation" },
      { status: 500 },
    );
  }
}
