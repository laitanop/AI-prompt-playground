import type Anthropic from "@anthropic-ai/sdk";
import { saveReminder } from "./reminders";

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface DateTimeResult {
  datetime: string;
  dayOfWeek: string;
  humanReadable: string;
}

function getDayOfWeekName(date: Date): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[date.getDay()];
}

function formatHumanReadable(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getCurrentDatetime(): DateTimeResult {
  const now = new Date();
  const iso = now.toISOString();
  const dayOfWeek = getDayOfWeekName(now);
  const humanReadable = formatHumanReadable(now);
  return { datetime: iso, dayOfWeek, humanReadable };
}

function addDurationToDatetime(
  datetime: string,
  amount: number,
  unit: "minutes" | "hours" | "days" | "weeks",
): DateTimeResult {
  const date = new Date(datetime);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid datetime: ${datetime}`);
  }

  const multipliers: Record<string, number> = {
    minutes: 1,
    hours: 60,
    days: 24 * 60,
    weeks: 7 * 24 * 60,
  };

  const totalMinutes = amount * (multipliers[unit] || 1);
  date.setMinutes(date.getMinutes() + totalMinutes);

  const iso = date.toISOString();
  const dayOfWeek = getDayOfWeekName(date);
  const humanReadable = formatHumanReadable(date);
  return { datetime: iso, dayOfWeek, humanReadable };
}

function setReminder(message: string, datetime: string): ToolResult {
  try {
    const date = new Date(datetime);
    if (Number.isNaN(date.getTime())) {
      return { success: false, error: `Invalid datetime: ${datetime}` };
    }
    const reminder = saveReminder(message, datetime);
    return { success: true, data: { id: reminder.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set reminder",
    };
  }
}

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "get_current_datetime",
    description:
      "Get the current date and time. Call this before reasoning about any relative date ('today', 'next week', 'a week from Thursday') — you have no other way to know the current date and day of week.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "add_duration_to_datetime",
    description:
      "Add a duration (e.g., 7 days, 2 weeks) to a datetime string to compute a future date. Use this to calculate the final reminder datetime after determining the offset from today.",
    input_schema: {
      type: "object" as const,
      properties: {
        datetime: {
          type: "string",
          description: "ISO 8601 datetime string (e.g., 2026-07-22T15:30:00Z)",
        },
        amount: {
          type: "number",
          description: "The quantity to add (e.g., 7 for 7 days)",
        },
        unit: {
          type: "string",
          enum: ["minutes", "hours", "days", "weeks"],
          description: "The unit of time to add",
        },
      },
      required: ["datetime", "amount", "unit"],
    },
  },
  {
    name: "set_reminder",
    description:
      "Create a reminder for a future date and time. Call this once you have computed the final datetime and have the reminder message ready.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: {
          type: "string",
          description:
            "The reminder message (e.g., 'Doctor appointment' or 'Call mom')",
        },
        datetime: {
          type: "string",
          description: "ISO 8601 datetime string for when the reminder should fire",
        },
      },
      required: ["message", "datetime"],
    },
  },
];

export function executeTool(
  name: string,
  input: Record<string, unknown>,
): unknown {
  switch (name) {
    case "get_current_datetime":
      return getCurrentDatetime();

    case "add_duration_to_datetime":
      return addDurationToDatetime(
        input.datetime as string,
        input.amount as number,
        input.unit as "minutes" | "hours" | "days" | "weeks",
      );

    case "set_reminder":
      return setReminder(input.message as string, input.datetime as string);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
