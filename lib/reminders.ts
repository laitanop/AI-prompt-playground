export interface Reminder {
  id: string;
  message: string;
  datetime: string;
  createdAt: string;
}

const STORAGE_KEY = "prompt-playground:reminders";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getReminders(): Reminder[] {
  if (!isClient()) return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveReminder(message: string, datetime: string): Reminder {
  if (!isClient()) {
    throw new Error("Cannot save reminder: localStorage not available");
  }
  const reminders = getReminders();
  const reminder: Reminder = {
    id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    message,
    datetime,
    createdAt: new Date().toISOString(),
  };
  reminders.push(reminder);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  return reminder;
}

export function deleteReminder(id: string): void {
  if (!isClient()) return;
  const reminders = getReminders();
  const filtered = reminders.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearReminders(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
}
