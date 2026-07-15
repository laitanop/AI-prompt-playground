import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Prompt Playground",
  description: "Explore Claude API concepts: prompts, temperature, streaming, and structured data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
