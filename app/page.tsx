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
  const [expandedGuide, setExpandedGuide] = useState(true);
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [timing, setTiming] = useState<{
    firstToken: number | null;
    totalTime: number | null;
  }>({ firstToken: null, totalTime: null });
  const [isStreaming, setIsStreaming] = useState(false);

  const handlePreset = (preset: PresetKey) => {
    setSystemPrompt(SYSTEM_PRESETS[preset]);
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setError(null);
    setResponse("");
    setTokens(null);
    setTiming({ firstToken: null, totalTime: null });
    setIsStreaming(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          systemPrompt,
          temperature,
          stream: streamingEnabled,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get response");
      }

      if (streamingEnabled && res.body) {
        // Handle streaming response
        const startTime = performance.now();
        let firstTokenTime: number | null = null;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";

        setIsStreaming(true);

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            const endTime = performance.now();
            const totalTime = (endTime - startTime) / 1000;
            setTiming({
              firstToken: firstTokenTime,
              totalTime,
            });
            setIsStreaming(false);
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  if (firstTokenTime === null) {
                    const now = performance.now();
                    firstTokenTime = (now - startTime) / 1000;
                  }
                  fullResponse += data.text;
                  setResponse(fullResponse);
                }
                if (data.tokens) {
                  setTokens(data.tokens);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } else {
        // Handle regular response
        const data = await res.json();
        setResponse(data.message);
        setTokens(data.tokens);
      }
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
                <div className="info-icon-wrapper">
                  <span className="info-icon">ℹ️</span>
                  <div className="tooltip">
                    Temperature is a powerful parameter that controls how
                    predictable or creative Claude's responses will be.
                    Understanding how to use it effectively can dramatically
                    improve your AI applications.
                  </div>
                </div>
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

              {/* Temperature Guide Accordion */}
              <div
                className={`temp-guide-card ${expandedGuide ? "expanded" : "collapsed"}`}
              >
                <button
                  className="temp-guide-header"
                  onClick={() => setExpandedGuide(!expandedGuide)}
                >
                  <span className="chevron-icon">›</span>
                  <span className="temp-guide-icon">📊</span>
                  <span>Temperature Guide</span>
                </button>
                <div className="temp-guide">
                  <div className="temp-range">
                    <div className="range-header">❄️ Low (0.0 - 0.3)</div>
                    <div className="range-items">
                      <span>Factual responses</span>
                      <span>Coding assistance</span>
                      <span>Data extraction</span>
                      <span>Content moderation</span>
                    </div>
                  </div>

                  <div className="temp-range">
                    <div className="range-header">🌡️ Medium (0.4 - 0.7)</div>
                    <div className="range-items">
                      <span>Summarization</span>
                      <span>Educational content</span>
                      <span>Problem-solving</span>
                      <span>Creative writing (constrained)</span>
                    </div>
                  </div>

                  <div className="temp-range">
                    <div className="range-header">🔥 High (0.8 - 1.0)</div>
                    <div className="range-items">
                      <span>Brainstorming</span>
                      <span>Creative writing</span>
                      <span>Marketing content</span>
                      <span>Joke generation</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="control-section">
              <label>Your Message</label>
              <div className="streaming-toggle">
                <input
                  type="checkbox"
                  id="streaming-checkbox"
                  checked={streamingEnabled}
                  onChange={(e) => setStreamingEnabled(e.target.checked)}
                />
                <label htmlFor="streaming-checkbox">
                  <span className="toggle-icon">🌊</span>
                  Enable Streaming
                  <div className="info-icon-wrapper">
                    <span className="info-icon">ℹ️</span>
                    <div className="tooltip">
                      Streaming allows Claude to send responses token-by-token
                      in real-time, making responses feel more interactive and
                      immediate. Without streaming, you wait for the complete
                      response before seeing any output.
                    </div>
                  </div>
                </label>
              </div>
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
                <div className="response-content">
                  {response}
                  {isStreaming && <span className="cursor">▌</span>}
                </div>

                {streamingEnabled && timing.firstToken !== null && (
                  <div className="timing-info">
                    <span>⚡ First token: {timing.firstToken.toFixed(2)}s</span>
                    {timing.totalTime !== null && (
                      <span>✓ Total time: {timing.totalTime.toFixed(2)}s</span>
                    )}
                  </div>
                )}

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
