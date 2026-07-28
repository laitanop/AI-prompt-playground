// Shared constants for the Multimodal & Advanced Features section.
// The page and the /api/multimodal route both import from here so the
// sub-section list, model choice, and demo documents stay in one place.

/**
 * Models used in this section. Most of these features are model-gated, so the
 * choice is per demo rather than one constant:
 *
 *   - Image, PDF, and citations behave identically on Haiku 4.5, so they use
 *     the same model as the rest of the course at a fraction of the cost.
 *   - Extended thinking needs Opus 5: Haiku 4.5 rejects both `adaptive`
 *     thinking and the `effort` parameter with a 400.
 */
export const HAIKU = "claude-haiku-4-5-20251001";
export const OPUS = "claude-opus-5";

export type DemoId = "thinking" | "image" | "pdf" | "citations";

export interface SubSection {
  id: DemoId;
  emoji: string;
  title: string;
  tagline: string;
  /** One-line answer to "what problem does this solve?" */
  problem: string;
  /** Model this demo calls. */
  model: string;
  /** Why this demo uses that model — surfaced in the UI. */
  modelReason: string;
}

/** Convenience lookup for the API route. */
export function modelFor(demo: DemoId): string {
  return SUB_SECTIONS.find((s) => s.id === demo)!.model;
}

export const SUB_SECTIONS: SubSection[] = [
  {
    id: "thinking",
    emoji: "🧠",
    title: "Extended Thinking",
    tagline: "Let Claude reason before it answers.",
    problem:
      "Hard problems get wrong answers when the model has to commit to its first token immediately. Thinking gives it scratch space first.",
    model: OPUS,
    modelReason:
      "Haiku 4.5 rejects both adaptive thinking and the effort parameter with a 400 — it only supports the older fixed budget_tokens shape.",
  },
  {
    id: "image",
    emoji: "🖼️",
    title: "Image Support",
    tagline: "Send screenshots, charts, and photos as message content.",
    problem:
      "Plenty of the information you want Claude to reason about lives in pixels — a dashboard screenshot, a whiteboard photo, a scanned form.",
    model: HAIKU,
    modelReason:
      "Vision works the same on Haiku 4.5, so this demo uses the course's default model. Opus 5 accepts higher-resolution images (2576px vs 1568px) if you need the extra detail.",
  },
  {
    id: "pdf",
    emoji: "📄",
    title: "PDF Support",
    tagline: "Hand Claude a whole document, text and layout together.",
    problem:
      "Extracting text from a PDF throws away tables, columns, and figures. Sending the PDF itself keeps the visual structure intact.",
    model: HAIKU,
    modelReason:
      "PDF input works the same on Haiku 4.5. Its 200K context caps documents at 100 pages, where a 1M-context model like Opus 5 goes to 600.",
  },
  {
    id: "citations",
    emoji: "🔗",
    title: "Citations",
    tagline: "Make every claim point back to the source text.",
    problem:
      "A grounded answer you can't verify is still a leap of faith. Citations attach exact source spans to each sentence.",
    model: HAIKU,
    modelReason:
      "Citations are supported on every current model, so this demo stays on the course's default.",
  },
];

/** Effort levels supported by Claude Opus 5, cheapest first. */
export const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;

export type Effort = (typeof EFFORT_LEVELS)[number];

/**
 * A reasoning problem that visibly benefits from thinking. Deliberately has a
 * trap in it (the discount applies before tax, not after), so a no-thinking
 * answer and a thinking answer tend to differ.
 */
export const THINKING_PRESETS = [
  {
    label: "Multi-step pricing",
    prompt:
      "A warehouse robot lists at $48,000. A customer buys 7 units. Orders of 5 or more get 12% off list, and orders over $300,000 (measured after that discount) get an extra 4% off. Sales tax of 8.25% applies to the final discounted amount. Shipping is $1,200 per unit and is not taxed. What does the customer pay in total?",
  },
  {
    label: "Logic puzzle",
    prompt:
      "Five servers (A–E) each failed on a different day, Monday through Friday. A failed after C but before E. B failed on Monday. D failed the day immediately after E. On which day did C fail?",
  },
  {
    label: "Code review",
    prompt:
      "This function is supposed to return the median of a list of numbers:\n\nfunction median(xs) {\n  xs.sort();\n  const mid = Math.floor(xs.length / 2);\n  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;\n}\n\nFind every bug and explain the impact of each.",
  },
];

export const IMAGE_PRESETS = [
  "Describe what you see in detail.",
  "Transcribe all the text in this image, preserving its layout.",
  "What is the main takeaway a reader should get from this?",
];

export const PDF_PRESETS = [
  "Summarise this document in five bullet points.",
  "List every number that appears, and say what each one measures.",
  "What questions does this document leave unanswered?",
];

export const CITATION_PRESETS = [
  "What risk factors does this company have?",
  "How fast is revenue growing, and what is driving it?",
  "Is the company involved in any lawsuits?",
  "Who sits on the board, and how independent is it?",
];

/** Accepted image media types, mirroring what the Messages API accepts. */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

/** Client-side upload ceilings. The API caps a whole request at 32 MB. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 15 * 1024 * 1024;
