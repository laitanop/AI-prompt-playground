"use client";

import { useState } from "react";

const SYSTEM_PRESETS = {
  pirate:
    "You are a pirate who speaks in riddles and nautical terms. Use 'arr' and 'matey' frequently.",
  teacher:
    "You are a patient math tutor. Do not directly answer a student's question. Guide them to a solution step by step.",
  oneWord: "Respond with only one word answers. Be creative and clever.",
};

type PresetKey = keyof typeof SYSTEM_PRESETS;

export default function Home() {
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PRESETS.teacher);
  const [temperature, setTemperature] = useState(0.7);
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<{
    input: number;
    output: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreset = (preset: PresetKey) => {
    setSystemPrompt(SYSTEM_PRESETS[preset]);
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setError(null);
    setResponse("");
    setTokens(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          systemPrompt,
          temperature,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get response");
      }

      const data = await res.json();
      setResponse(data.message);
      setTokens(data.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSend();
    }
  };

  return (
    <main>
      <div className="container">
        <header>
          <h1>🎨 AI Prompt Playground</h1>
          <p>
            Explore Claude API concepts: system prompts, temperature, and more
          </p>
        </header>

        <div className="playground">
          {/* Left Panel: Controls */}
          <div className="controls-panel">
            {/* System Prompt Section */}
            <div className="control-section">
              <label>
                System Prompt
                <div className="info-icon-wrapper">
                  <span className="info-icon">ℹ️</span>
                  <div className="tooltip">
                    System prompts are a powerful way to customize how Claude
                    responds to user input. Instead of getting generic answers,
                    you can shape Claude's tone, style, and approach to match
                    your specific use case
                  </div>
                </div>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Define Claude's personality and behavior..."
                rows={5}
              />
              <div className="preset-buttons">
                <button onClick={() => handlePreset("pirate")}>
                  🏴‍☠️ Pirate
                </button>
                <button onClick={() => handlePreset("teacher")}>
                  👨‍🏫 Teacher
                </button>
                <button onClick={() => handlePreset("oneWord")}>
                  🤐 One-Word
                </button>
              </div>
            </div>

            {/* Temperature Section */}
            <div className="control-section">
              <label>
                Temperature:{" "}
                <span className="temp-value">{temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="slider"
              />
              <div className="temp-labels">
                <span>0 (predictable)</span>
                <span>1 (creative)</span>
              </div>
            </div>

            {/* Message Input */}
            <div className="control-section">
              <label>Your Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Claude anything... (Ctrl+Enter to send)"
                rows={4}
              />
              <button
                onClick={handleSend}
                disabled={loading || !message.trim()}
                className="send-button"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>

          {/* Right Panel: Response */}
          <div className="response-panel">
            {error && <div className="error-box">{error}</div>}

            {response && (
              <>
                <div className="response-content">{response}</div>
                {tokens && (
                  <div className="token-info">
                    <span>Input: {tokens.input} tokens</span>
                    <span>Output: {tokens.output} tokens</span>
                    <span>Total: {tokens.input + tokens.output} tokens</span>
                  </div>
                )}
              </>
            )}

            {!response && !error && (
              <div className="placeholder">
                <p>Send a message to get started...</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="info-box">
          <h3>💡 Tip</h3>
          <p>
            Try the same question with different system prompts and
            temperatures. Notice how the pirate gets creative at temperature 1,
            but the teacher stays focused at temperature 0.
          </p>
        </div>
      </div>
    </main>
  );
}
