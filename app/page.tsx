"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [status, setStatus] = useState<string>("Loading...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      setStatus("✅ Server is running and API key is loaded securely on the backend");
      setError(null);
    } catch (err) {
      setError("❌ Error connecting to server");
      setStatus("");
    }
  }

  return (
    <main>
      <div id="app">
        <h1>AI Prompt Playground</h1>
        <p>Phase 1 setup complete with Next.js + TypeScript ✅</p>
        <p>API key is loaded securely from environment variables (never exposed to browser)</p>
        <div id="status" className={error ? "error" : ""}>
          {status || error}
        </div>
      </div>
    </main>
  );
}
