import type { SignalSeverity, TaskCategory, TaskPriority, TaskStatus, TimelineType } from "@/lib/types";

export const categoryLabels: Record<TaskCategory, string> = {
  appointment: "Appointment",
  transport: "Transport",
  medication: "Medication",
  admin: "Admin",
  finance: "Finance",
  "check-in": "Check-in",
  "home safety": "Home safety"
};

export const statusLabels: Record<TaskStatus, string> = {
  unclaimed: "Ready to pick up",
  claimed: "Claimed",
  done: "Done",
  blocked: "Blocked"
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High"
};

export const timelineLabels: Record<TimelineType, string> = {
  note: "Note",
  document: "Document",
  appointment: "Appointment",
  task: "Task",
  "voice update": "Voice update",
  "meeting summary": "Meeting summary",
  "care signal": "Care signal"
};

export const severityLabels: Record<SignalSeverity, string> = {
  normal: "Normal",
  watch: "Watch",
  alert: "Needs check-in"
};
