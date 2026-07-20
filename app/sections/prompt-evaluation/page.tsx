"use client";

import { useState } from "react";
import SectionNav from "@/components/SectionNav";
import type { EvalResult, TestCase } from "@/lib/grading";

const DEFAULT_SYSTEM_PROMPT = "Please answer the user's question.";

const DEFAULT_TEST_CASES: TestCase[] = [
  { id: "1", input: "What's 2+2?", criteria: "" },
  { id: "2", input: "How do I make oatmeal?", criteria: "" },
  { id: "3", input: "How far away is the Moon?", criteria: "" },
];

const MAX_TEST_CASES = 20;
const MAX_SCORE = 10;

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function scoreTier(score: number): "high" | "mid" | "low" {
  if (score >= 8) return "high";
  if (score >= 5) return "mid";
  return "low";
}

export default function PromptEvaluationPage() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [testCases, setTestCases] = useState<TestCase[]>(DEFAULT_TEST_CASES);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<EvalResult[] | null>(null);
  const [summary, setSummary] = useState<{
    average: number;
    total: number;
  } | null>(null);
  const [previousSummary, setPreviousSummary] = useState<{
    average: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    systemPrompt.trim().length > 0 &&
    testCases.length > 0 &&
    testCases.every((tc) => tc.input.trim());

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setTestCases(DEFAULT_TEST_CASES);
    setResults(null);
    setSummary(null);
    setPreviousSummary(null);
    setError(null);
  };

  const handleAddTestCase = () => {
    if (testCases.length >= MAX_TEST_CASES) return;
    setTestCases([...testCases, { id: makeId(), input: "", criteria: "" }]);
  };

  const handleRemoveTestCase = (id: string) => {
    setTestCases(testCases.filter((tc) => tc.id !== id));
  };

  const handleTestCaseChange = (
    id: string,
    field: "input" | "criteria",
    value: string,
  ) => {
    setTestCases(
      testCases.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc)),
    );
  };

  const handleRun = async () => {
    if (!isValid) return;

    setRunning(true);
    setError(null);
    setResults(null);
    setPreviousSummary(summary);
    setSummary(null);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, testCases }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to run evaluation");
      }

      setResults(data.results);
      setSummary(data.summary);
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
          <h1>🧪 Section 2: Prompt Evaluation</h1>
          <p>
            prompt evaluation helps you measure how well those prompts actually
            work.
          </p>
        </header>

        <div className="eval-panel">
          {/* System Prompt */}
          <div className="control-section">
            <label>
              Prompt Under Test
              <div className="info-icon-wrapper">
                <span className="info-icon">ℹ️</span>
                <div className="tooltip">
                  This is the system prompt being evaluated. Every test case
                  below sends its message to Claude using this prompt, then a
                  second Claude call grades the response.
                </div>
              </div>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define the prompt you want to evaluate..."
              rows={3}
            />
          </div>

          {/* Grading */}
          <div className="control-section">
            <label>
              Grading Method: Model-graded
              <div className="info-icon-wrapper">
                <span className="info-icon">ℹ️</span>
                <div className="tooltip">
                  A second Claude call acts as a judge: given the message and
                  the response, it scores 0–10. If a test case has criteria, the
                  judge scores against that. If not, it scores overall quality,
                  accuracy, and helpfulness instead.
                </div>
              </div>
            </label>
            <p className="mode-toggle-hint">
              Draft a prompt → run it against your eval dataset → feed every
              response through the grader → get an averaged score. Try it: run
              the bare prompt above as-is, then edit it to add something like
              &quot;Answer with ample detail&quot; and run again — watch the
              average change.
            </p>
          </div>

          {/* Test Cases */}
          <div className="control-section">
            <label>Test Cases (Eval Dataset)</label>
            <div className="test-case-list">
              {testCases.map((tc, index) => (
                <div key={tc.id} className="test-case-card">
                  <div className="test-case-card-header">
                    <span>Test Case {index + 1}</span>
                    <button
                      type="button"
                      className="remove-test-case-button"
                      onClick={() => handleRemoveTestCase(tc.id)}
                      aria-label={`Remove test case ${index + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                  <label>Message</label>
                  <textarea
                    value={tc.input}
                    onChange={(e) =>
                      handleTestCaseChange(tc.id, "input", e.target.value)
                    }
                    placeholder="What the user asks Claude..."
                    rows={2}
                  />
                  <label>Grading criteria (optional)</label>
                  <textarea
                    value={tc.criteria ?? ""}
                    onChange={(e) =>
                      handleTestCaseChange(tc.id, "criteria", e.target.value)
                    }
                    placeholder="leave blank to grade overall quality — or describe what a good response should do"
                    rows={2}
                  />
                </div>
              ))}
            </div>
            <div className="test-case-actions">
              <button
                type="button"
                className="add-test-case-button"
                onClick={handleAddTestCase}
                disabled={testCases.length >= MAX_TEST_CASES}
              >
                + Add test case
              </button>
              <button
                type="button"
                className="reset-defaults-button"
                onClick={handleReset}
              >
                Reset to defaults
              </button>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={running || !isValid}
            className="send-button"
          >
            {running ? "Running..." : "Run Evaluation"}
          </button>
        </div>

        {/* Results */}
        {error && <div className="error-box">{error}</div>}

        {summary && (
          <div className={`eval-summary ${scoreTier(summary.average)}`}>
            Average score: {summary.average.toFixed(1)} / {MAX_SCORE}
            <span className="eval-summary-sub">
              {" "}
              across {summary.total} test case{summary.total === 1 ? "" : "s"}
              {previousSummary && (
                <>
                  {" · "}
                  {summary.average > previousSummary.average
                    ? "▲"
                    : summary.average < previousSummary.average
                      ? "▼"
                      : "—"}{" "}
                  {Math.abs(summary.average - previousSummary.average).toFixed(
                    1,
                  )}{" "}
                  vs. previous run ({previousSummary.average.toFixed(1)})
                </>
              )}
            </span>
          </div>
        )}

        {results && (
          <div className="results-list">
            {results.map((result, index) => (
              <div key={result.id} className="result-card">
                <div className="test-case-card-header">
                  <span>Test Case {index + 1}</span>
                  {result.error ? (
                    <span className="score-badge low">ERROR</span>
                  ) : (
                    <span
                      className={`score-badge ${scoreTier(result.score ?? 0)}`}
                    >
                      {result.score} / {MAX_SCORE}
                    </span>
                  )}
                </div>
                <p>
                  <strong>Message:</strong> {result.input}
                </p>
                {result.error ? (
                  <div className="error-box">{result.error}</div>
                ) : (
                  <>
                    <div className="response-content">{result.response}</div>
                    {result.reasoning && (
                      <div className="result-reasoning">
                        <strong>Judge reasoning:</strong> {result.reasoning}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
