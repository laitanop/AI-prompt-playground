import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude API Course Playground",
  description:
    "A hands-on companion to Anthropic's Building with the Claude API course, one section per curriculum module",
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
