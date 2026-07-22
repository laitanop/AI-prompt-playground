"use client";

import { useEffect, useState } from "react";
import SectionNav from "@/components/SectionNav";
import { runToolLoop, type StepEvent } from "@/lib/tool-loop";
import { getReminders, deleteReminder, clearReminders } from "@/lib/reminders";
import type { Reminder } from "@/lib/reminders";

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant with access to tools for managing reminders.

**How to handle reminder requests:**
1. Always start with get_current_datetime to know today's date and day of week
2. If given a relative date like "next Thursday", calculate the number of days from today
3. Use add_duration_to_datetime to compute the target datetime
4. Call set_reminder with the message and final datetime
5. Confirm to the user that the reminder was set

**Key insight:** You cannot guess dates — always use tools.`;

const DEFAULT_MESSAGE =
  "Set a reminder for my doctor's appointment. It's a week from Thursday.";

export default function ToolIntegrationPage() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<string | null>("overview");

  useEffect(() => {
    setReminders(getReminders());
  }, []);

  const handleRun = async () => {
    if (!message.trim() || !systemPrompt.trim()) return;

    setRunning(true);
    setError(null);
    setSteps([]);

    try {
      for await (const event of runToolLoop(message, systemPrompt)) {
        setSteps((prev) => [...prev, event]);
      }
      setReminders(getReminders());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteReminder = (id: string) => {
    deleteReminder(id);
    setReminders(getReminders());
  };

  const handleClearReminders = () => {
    clearReminders();
    setReminders([]);
  };

  const toolDetails = [
    {
      id: "get_current_datetime",
      emoji: "📅",
      name: "get_current_datetime",
      description: "Get today's date and day of week",
      example: "Claude uses this first to know what 'today' is",
      color: "blue",
    },
    {
      id: "add_duration_to_datetime",
      emoji: "➕",
      name: "add_duration_to_datetime",
      description: "Add days/weeks/hours to a date",
      example: "Claude uses this to calculate 'a week from Thursday'",
      color: "green",
    },
    {
      id: "set_reminder",
      emoji: "📌",
      name: "set_reminder",
      description: "Create a reminder for a specific date and time",
      example: "Claude uses this to save the reminder to your list",
      color: "purple",
    },
  ];

  return (
    <main>
      <div className="container">
        <SectionNav />
        <header>
          <h1>🔧 Section 3: Tool Use & Integration</h1>
          <p>
            Claude can't do everything alone. Give it tools — watch it reason
            through the problem and use them to get the job done.
          </p>
        </header>

        {/* Learning Callout */}
        <div className="learning-callout">
          <div className="callout-icon">💡</div>
          <div className="callout-content">
            <strong>Why tools matter:</strong> Claude doesn't know today's date
            or how to save data. When you ask it to "set a reminder for next
            Thursday," it must use tools to figure out what date that is, then
            save it.
          </div>
        </div>

        {/* Section 1: Understanding Tools */}
        <div className="section-card">
          <h2>🛠️ The Three Tools</h2>
          <p className="section-subtitle">
            Here are the tools Claude can use for this task:
          </p>
          <div className="tools-grid">
            {toolDetails.map((tool) => (
              <div
                key={tool.id}
                className={`tool-card tool-${tool.color}`}
                onClick={() =>
                  setExpandedTools(expandedTools === tool.id ? null : tool.id)
                }
              >
                <div className="tool-header">
                  <span className="tool-emoji">{tool.emoji}</span>
                  <div>
                    <div className="tool-name">{tool.name}</div>
                    <div className="tool-desc">{tool.description}</div>
                  </div>
                  <span className="tool-expand">
                    {expandedTools === tool.id ? "−" : "+"}
                  </span>
                </div>
                {expandedTools === tool.id && (
                  <div className="tool-detail">
                    <div className="detail-label">How Claude uses it:</div>
                    <p>{tool.example}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Set it up */}
        <div className="section-card">
          <h2>⚙️ Configuration</h2>

          {/* System Prompt */}
          <div className="control-section">
            <label>
              System Prompt
              <div className="info-icon-wrapper">
                <span className="info-icon">ℹ️</span>
                <div className="tooltip">
                  This tells Claude what tools it has, how to use them, and
                  when to use them. The instructions guide its reasoning.
                </div>
              </div>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define how Claude should use the available tools..."
              rows={6}
            />
            <div className="textarea-hint">
              ✏️ Try editing the system prompt to see how it changes Claude's
              behavior
            </div>
          </div>

          {/* Your Message */}
          <div className="control-section">
            <label>
              Your Request
              <div className="info-icon-wrapper">
                <span className="info-icon">ℹ️</span>
                <div className="tooltip">
                  This is what you're asking Claude to do. Try different
                  requests to see how Claude uses different tools.
                </div>
              </div>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask Claude to set a reminder..."
              rows={3}
            />
            <div className="textarea-hint">
              Try: "Remind me to call Mom tomorrow" or "Set a reminder for next
              Monday at 2pm to check the report"
            </div>
          </div>
        </div>

        {/* Section 3: Run & Watch */}
        <div className="section-card run-section">
          <h2>▶️ Watch the Agentic Loop</h2>
          <p className="section-subtitle">
            Click "Run" to watch Claude reason through the problem step by step,
            calling tools as needed.
          </p>
          <button
            onClick={handleRun}
            disabled={running || !message.trim() || !systemPrompt.trim()}
            className="send-button run-button"
          >
            {running ? "⏳ Running..." : "▶️ Run"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="error-box">
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Execution Log */}
        {steps.length > 0 && (
          <div className="section-card execution-section">
            <h2>📊 Execution Steps</h2>
            <p className="section-subtitle">
              Watch the loop in action — each line shows what Claude or the
              tools did:
            </p>
            <div className="loop-steps">
              {steps.map((step, index) => (
                <div key={index} className="loop-step">
                  {step.type === "user_text" && (
                    <div className="step-user">
                      <div className="step-icon">👤</div>
                      <div className="step-content">
                        <div className="step-label">You said:</div>
                        <div className="step-text">{step.text}</div>
                      </div>
                    </div>
                  )}
                  {step.type === "assistant_text" && (
                    <div className="step-assistant">
                      <div className="step-icon">🤖</div>
                      <div className="step-content">
                        <div className="step-label">Claude replied:</div>
                        <div className="step-text">{step.text}</div>
                      </div>
                    </div>
                  )}
                  {step.type === "tool_call" && (
                    <div className="tool-call-card">
                      <div className="tool-call-icon">
                        {toolDetails.find((t) => t.id === step.name)?.emoji}
                      </div>
                      <div className="tool-call-content">
                        <div className="tool-call-label">
                          Claude called {step.name}
                        </div>
                        <details className="tool-io-detail">
                          <summary>Show input</summary>
                          <div className="tool-io">
                            <pre>{JSON.stringify(step.input, null, 2)}</pre>
                          </div>
                        </details>
                      </div>
                    </div>
                  )}
                  {step.type === "tool_result" && (
                    <div
                      className={`tool-result-card${
                        step.isError ? " error" : " success"
                      }`}
                    >
                      <div className="tool-result-icon">
                        {step.isError ? "❌" : "✅"}
                      </div>
                      <div className="tool-result-content">
                        <div className="tool-result-label">
                          {step.isError ? "Tool error" : "Tool returned"}
                        </div>
                        <details className="tool-io-detail">
                          <summary>
                            Show result
                            {!step.isError
                              ? ` (${
                                  typeof step.result === "object"
                                    ? Object.keys(step.result as object).length
                                    : 1
                                } fields)`
                              : ""}
                          </summary>
                          <div className="tool-io">
                            <pre>{JSON.stringify(step.result, null, 2)}</pre>
                          </div>
                        </details>
                      </div>
                    </div>
                  )}
                  {step.type === "done" && (
                    <div
                      className={`step-done ${
                        step.reminderCreated ? "success" : "incomplete"
                      }`}
                    >
                      <div className="done-icon">
                        {step.reminderCreated ? "🎉" : "⚠️"}
                      </div>
                      <div className="done-content">
                        {step.reminderCreated ? (
                          <>
                            <strong>Success!</strong> The reminder was created
                            and saved.
                          </>
                        ) : (
                          <>
                            <strong>Incomplete.</strong> Claude finished but
                            didn't create a reminder. Try rephrasing your
                            request.
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {step.type === "limit_reached" && (
                    <div className="error-box">
                      <strong>⚠️ Step limit reached.</strong> Claude kept calling
                      tools but didn't finish. Try a simpler request or adjust
                      the system prompt.
                    </div>
                  )}
                  {step.type === "stop_incomplete" && (
                    <div className="error-box">
                      <strong>⚠️ Unexpected stop.</strong> Claude stopped
                      reasoning ({step.stopReason}). This shouldn't happen —
                      try again.
                    </div>
                  )}
                  {step.type === "api_error" && (
                    <div className="error-box">
                      <strong>🔴 API error:</strong> {step.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Reminders */}
        <div className="section-card reminders-section">
          <div className="reminders-header">
            <div>
              <h2>📌 Your Saved Reminders</h2>
              <p className="section-subtitle">
                These are the reminders Claude created (stored in your browser):
              </p>
            </div>
            {reminders.length > 0 && (
              <button
                className="clear-reminders-btn"
                onClick={handleClearReminders}
              >
                Clear all
              </button>
            )}
          </div>
          {reminders.length === 0 ? (
            <div className="reminder-empty">
              <div className="empty-icon">🗂️</div>
              <div className="empty-text">
                No reminders yet. Try asking Claude to set one above!
              </div>
            </div>
          ) : (
            <div className="reminder-list">
              {reminders
                .sort(
                  (a, b) =>
                    new Date(a.datetime).getTime() -
                    new Date(b.datetime).getTime(),
                )
                .map((reminder) => {
                  const reminderDate = new Date(reminder.datetime);
                  const today = new Date();
                  const isToday =
                    reminderDate.toDateString() === today.toDateString();
                  const isSoon =
                    reminderDate.getTime() - today.getTime() <
                    24 * 60 * 60 * 1000;

                  return (
                    <div
                      key={reminder.id}
                      className={`reminder-item ${
                        isToday ? "today" : isSoon ? "soon" : ""
                      }`}
                    >
                      <div className="reminder-indicator">
                        {isToday && "🔴"}
                        {!isToday && isSoon && "🟡"}
                        {!isToday && !isSoon && "⚪"}
                      </div>
                      <div className="reminder-content">
                        <div className="reminder-message">
                          {reminder.message}
                        </div>
                        <div className="reminder-datetime">
                          {reminderDate.toLocaleString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <button
                        className="reminder-delete"
                        onClick={() => handleDeleteReminder(reminder.id)}
                        aria-label="Delete reminder"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Key Concepts */}
        <div className="concepts-box">
          <h3>🎯 Key Concepts</h3>
          <div className="concepts-grid">
            <div className="concept">
              <div className="concept-icon">🔄</div>
              <div className="concept-title">Agentic Loop</div>
              <p>Claude decides what to do next, calls tools, sees results, and loops until done.</p>
            </div>
            <div className="concept">
              <div className="concept-icon">🛠️</div>
              <div className="concept-title">Tool Calling</div>
              <p>Claude can't do everything — it asks for help by calling tools you provide.</p>
            </div>
            <div className="concept">
              <div className="concept-icon">🧠</div>
              <div className="concept-title">Reasoning</div>
              <p>The system prompt guides Claude's reasoning about which tools to use when.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
