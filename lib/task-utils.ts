import type { TaskCategory, TaskPriority } from "@/lib/types";

export function normalizeDueDate(value: string | undefined, fallbackDays = 2) {
  const parsed = value ? new Date(value) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed.toISOString();

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + fallbackDays);
  fallback.setHours(18, 0, 0, 0);
  return fallback.toISOString();
}

export function asTaskCategory(value: string): TaskCategory {
  const allowed: TaskCategory[] = ["appointment", "transport", "medication", "admin", "finance", "check-in", "home safety"];
  return allowed.includes(value as TaskCategory) ? (value as TaskCategory) : "admin";
}

export function asTaskPriority(value: string): TaskPriority {
  const allowed: TaskPriority[] = ["low", "medium", "high"];
  return allowed.includes(value as TaskPriority) ? (value as TaskPriority) : "medium";
}
