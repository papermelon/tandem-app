import type {
  AppData,
  CareRecipient,
  FamilyMember,
  HandoverAppointment,
  HandoverCaregiverRef,
  HandoverChecklistItem,
  HandoverHistoryEntry,
  Task,
  TimelineItem
} from "@/lib/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function withinDays(value: string, days: number, direction: "past" | "future") {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return false;
  const now = Date.now();
  const diff = ts - now;
  if (direction === "past") return diff <= 0 && diff >= -days * MS_PER_DAY;
  return diff >= 0 && diff <= days * MS_PER_DAY;
}

export function autoBriefing(recipient: CareRecipient, timeline: TimelineItem[], tasks: Task[]) {
  const recentNote = timeline.find((item) => item.type === "note" || item.type === "voice update");
  const acuteSignal = timeline.find((item) => item.severity === "alert" || item.severity === "watch");
  const openTasks = tasks.filter((task) => task.status !== "done").length;

  const lines = [
    `${recipient.name} — ${recipient.context}.`,
    recentNote ? `Recent: ${recentNote.title}.` : "No new notes in the past few days.",
    acuteSignal ? `Watch: ${acuteSignal.title}.` : "No acute issues flagged.",
    `${openTasks} open task${openTasks === 1 ? "" : "s"} in the queue.`
  ];

  return lines.join(" ");
}

export function autoCareHistory(timeline: TimelineItem[], days = 7): HandoverHistoryEntry[] {
  return timeline
    .filter((item) => withinDays(item.timestamp, days, "past"))
    .slice(0, 8)
    .map((item) => ({
      id: makeId("hh"),
      date: item.timestamp,
      title: item.title,
      note: item.description,
      images: []
    }));
}

export function autoUpcomingAppointments(tasks: Task[], timeline: TimelineItem[], days = 7): HandoverAppointment[] {
  const fromTasks = tasks
    .filter((task) => task.category === "appointment" && withinDays(task.dueDate, days, "future"))
    .map<HandoverAppointment>((task) => ({
      id: makeId("ha"),
      date: task.dueDate,
      title: task.title
    }));

  const fromTimeline = timeline
    .filter((item) => item.type === "appointment" && withinDays(item.timestamp, days, "future"))
    .map<HandoverAppointment>((item) => ({
      id: makeId("ha"),
      date: item.timestamp,
      title: item.title
    }));

  return [...fromTasks, ...fromTimeline].slice(0, 8);
}

export function autoOtherCaregivers(members: FamilyMember[], excludeId: string): HandoverCaregiverRef[] {
  return members
    .filter((member) => member.id !== excludeId)
    .map((member) => ({
      memberId: member.id,
      name: member.name,
      loadPct: member.loadCapacityPct ?? 50,
      phone: member.phone,
      available: (member.loadCapacityPct ?? 50) < 80
    }));
}

export function autoDailyChecklist(tasks: Task[]): HandoverChecklistItem[] {
  const seenCategories = new Set<string>();
  const items: HandoverChecklistItem[] = [];

  for (const task of tasks) {
    if (task.status === "done") continue;
    if (seenCategories.has(task.category)) continue;
    seenCategories.add(task.category);
    items.push({
      id: makeId("hc"),
      label: task.title,
      description: task.notes,
      completed: false
    });
    if (items.length >= 5) break;
  }

  if (items.length === 0) {
    items.push(
      { id: makeId("hc"), label: "Morning medication routine", description: "Confirm medications taken with breakfast.", completed: false },
      { id: makeId("hc"), label: "Mobility exercises", description: "Light stretching twice a day.", completed: false },
      { id: makeId("hc"), label: "Evening check-in call", description: "Call to share how the day went.", completed: false }
    );
  }

  return items;
}

export function buildHandoverDraft(data: AppData, departingCaregiverId: string) {
  return {
    briefing: autoBriefing(data.recipient, data.timeline, data.tasks),
    careHistory: autoCareHistory(data.timeline, 7),
    upcomingAppointments: autoUpcomingAppointments(data.tasks, data.timeline, 7),
    otherCaregivers: autoOtherCaregivers(data.members, departingCaregiverId),
    dailyChecklist: autoDailyChecklist(data.tasks)
  };
}
