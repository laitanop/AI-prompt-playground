// Central registry of course sections. The landing page and the shared nav
// both read from this list, so adding a new module later means editing
// this file only.

export type SectionStatus = "done" | "in-progress" | "planned";

export interface CourseSection {
  id: string;
  title: string;
  tagline: string;
  concepts: string[];
  status: SectionStatus;
  /** Route to the section's page, or "#" while it's still just a roadmap entry. */
  href: string;
  /** Optional card thumbnail, path under /public. */
  image?: string;
}

export const sections: CourseSection[] = [
  {
    id: "api-basics",
    title: "Accessing Claude with the API",
    tagline: "Auth, system prompts, temperature, and response streaming.",
    concepts: [
      "API keys handled server-side",
      "System prompts",
      "Temperature",
      "Streaming (SSE)",
      "Structured/JSON output",
    ],
    status: "in-progress",
    href: "/sections/api-basics",
    image: "/images/api-basics-card.png",
  },
  {
    id: "prompt-evaluation",
    title: "Prompt Evaluation",
    tagline: "Writing test cases and grading Claude's outputs systematically.",
    concepts: [
      "Eval test cases",
      "Grading rubrics",
      "Model-graded evals",
      "Change prompt & repeat",
    ],
    status: "done",
    href: "/sections/prompt-evaluation",
    image: "/images/prompt-evaluation-card.png",
  },
  {
    id: "tool-integration",
    title: "Tool Use & Integration",
    tagline: "Giving Claude functions to call and handling multi-step tool loops.",
    concepts: [
      "Tool definitions",
      "Tool-use loop",
      "Parallel tool calls",
      "Forced tool choice",
    ],
    status: "planned",
    href: "#",
  },
  {
    id: "rag",
    title: "Retrieval-Augmented Generation",
    tagline: "Grounding answers in your own documents.",
    concepts: ["Chunking & embeddings", "Retrieval", "Citations", "Context windows"],
    status: "planned",
    href: "#",
  },
  {
    id: "multimodal",
    title: "Multimodal (Images & Documents)",
    tagline: "Sending images and PDFs to Claude for analysis.",
    concepts: ["Vision", "PDF understanding", "Base64 encoding", "Mixed content messages"],
    status: "planned",
    href: "#",
  },
  {
    id: "automated-workflows",
    title: "Automated Workflows",
    tagline: "Chaining prompts and tools into multi-step agentic pipelines.",
    concepts: ["Prompt chaining", "Orchestration", "Agentic loops", "Error handling & retries"],
    status: "planned",
    href: "#",
  },
];
