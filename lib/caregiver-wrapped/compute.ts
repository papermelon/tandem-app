import { pickComparisons } from "@/lib/caregiver-wrapped/comparisons";
import type {
  WrappedCriticalMoment,
  WrappedKeyMoment,
  WrappedSnapshot
} from "@/lib/caregiver-wrapped/types";
import type { AppData, Task, TaskCategory, TimelineItem } from "@/lib/types";

const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeWrappedSnapshot(
  data: AppData,
  memberId: string,
  options: { seed?: number; comparisonCount?: number } = {}
): WrappedSnapshot | null {
  const member = data.members.find((m) => m.id === memberId);
  if (!member) return null;

  const memberTasks = data.tasks.filter((task) => task.assigneeId === memberId);
  const doneTasks = memberTasks.filter((task) => task.status === "done");
  const memberTimeline = data.timeline.filter((item) => item.authorId === memberId);

  const seed = options.seed ?? hashString(`${memberId}|${doneTasks.length}|${memberTimeline.length}`);
  const comparisonCount = options.comparisonCount ?? 4;

  const referenceDates = collectReferenceDates(memberTasks, memberTimeline);
  const serviceStart = referenceDates.length ? referenceDates[0] : new Date().toISOString();
  const serviceEnd = referenceDates.length ? referenceDates[referenceDates.length - 1] : new Date().toISOString();
  const totalDaysActive = Math.max(
    1,
    Math.round((new Date(serviceEnd).getTime() - new Date(serviceStart).getTime()) / MS_PER_DAY) + 1
  );

  const totalTasksClaimed = memberTasks.length;
  const totalTasksDone = doneTasks.length;
  const averageTasksPerDay = totalDaysActive > 0 ? totalTasksDone / totalDaysActive : 0;

  const medicationTasks = memberTasks.filter((task) => task.category === "medication");
  const medicationOnTimeRatio = medicationTasks.length
    ? medicationTasks.filter((task) => task.status === "done").length / medicationTasks.length
    : 0;

  const nightShiftCount = memberTasks.filter((task) => isNightHour(task.dueDate)).length;
  const emergencyResponseCount = memberTasks.filter(
    (task) => task.priority === "high" || task.category === "appointment"
  ).length;

  const longestStreakDays = computeLongestStreak(
    [...memberTasks.map((t) => t.dueDate), ...memberTimeline.map((t) => t.timestamp)]
  );

  const { topCategory, topCategoryShare } = computeTopCategory(memberTasks);

  const criticalMoments = buildCriticalMoments(memberTasks, memberTimeline);

  const recipientName = data.recipient?.name ?? "your loved one";

  const keyMoments = buildKeyMoments(memberTimeline, recipientName);

  const baseSnapshot: WrappedSnapshot = {
    wrappedId: `wrap-${memberId}`,
    memberId,
    memberName: member.name,
    recipientName,
    serviceStart,
    serviceEnd,
    totalDaysActive,
    totalTasksDone,
    totalTasksClaimed,
    averageTasksPerDay,
    medicationOnTimeRatio,
    nightShiftCount,
    emergencyResponseCount,
    longestStreakDays,
    topCategory,
    topCategoryShare,
    criticalMoments,
    comparisons: [],
    keyMomentsTitle: keyMoments.length ? "Your highlight moments" : "Quiet care, big impact",
    keyMoments,
    circleStartedOn: serviceStart,
    shareCaption: buildShareCaption({
      memberName: member.name,
      totalDaysActive,
      totalTasksDone,
      recipientName
    }),
    seed
  };

  const comparisons = pickComparisons(baseSnapshot, comparisonCount, seed);
  return { ...baseSnapshot, comparisons };
}

function collectReferenceDates(tasks: Task[], timeline: TimelineItem[]): string[] {
  const all: string[] = [
    ...tasks.map((task) => task.dueDate),
    ...timeline.map((item) => item.timestamp)
  ].filter(Boolean);
  return all.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

function isNightHour(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const hour = date.getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

function computeLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const dayKeys = Array.from(
    new Set(
      dates
        .map((iso) => {
          const date = new Date(iso);
          return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
        })
        .filter((value): value is string => value !== null)
    )
  ).sort();

  let longest = 1;
  let current = 1;
  for (let i = 1; i < dayKeys.length; i += 1) {
    const prev = new Date(dayKeys[i - 1]).getTime();
    const cur = new Date(dayKeys[i]).getTime();
    const diff = Math.round((cur - prev) / MS_PER_DAY);
    if (diff === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function computeTopCategory(tasks: Task[]): {
  topCategory: TaskCategory | "general care";
  topCategoryShare: number;
} {
  if (tasks.length === 0) {
    return { topCategory: "general care", topCategoryShare: 0 };
  }

  const counts = new Map<TaskCategory, number>();
  for (const task of tasks) {
    counts.set(task.category, (counts.get(task.category) ?? 0) + 1);
  }

  let top: TaskCategory | null = null;
  let topCount = 0;
  for (const [category, count] of counts) {
    if (count > topCount) {
      top = category;
      topCount = count;
    }
  }

  if (!top) return { topCategory: "general care", topCategoryShare: 0 };
  return { topCategory: top, topCategoryShare: topCount / tasks.length };
}

function buildCriticalMoments(tasks: Task[], timeline: TimelineItem[]): WrappedCriticalMoment[] {
  const nightCount = tasks.filter((task) => isNightHour(task.dueDate)).length;
  const highPriority = tasks.filter((task) => task.priority === "high").length;
  const appointments = tasks.filter((task) => task.category === "appointment").length;
  const careSignals = timeline.filter((item) => item.type === "care signal").length;
  const meetings = timeline.filter((item) => item.type === "meeting summary").length;

  const moments: WrappedCriticalMoment[] = [];
  if (nightCount > 0) moments.push({ emoji: "🌙", count: nightCount, label: "late-night reminders kept on track" });
  if (highPriority > 0) moments.push({ emoji: "⚡", count: highPriority, label: "high-priority tasks owned" });
  if (appointments > 0) moments.push({ emoji: "🩺", count: appointments, label: "appointments coordinated" });
  if (careSignals > 0) moments.push({ emoji: "📡", count: careSignals, label: "care signals reviewed" });
  if (meetings > 0) moments.push({ emoji: "👨‍👩‍👧", count: meetings, label: "family meetings supported" });

  if (moments.length === 0) {
    moments.push({ emoji: "❤️", count: 1, label: "showed up when it mattered" });
  }
  return moments.slice(0, 4);
}

function buildKeyMoments(timeline: TimelineItem[], recipientName: string): WrappedKeyMoment[] {
  const sorted = [...timeline].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const ranked = sorted
    .map((item) => ({ item, score: scoreTimelineItem(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => item);

  return ranked.map((item) => ({
    id: item.id,
    emoji: emojiForTimelineType(item.type, item.severity),
    date: item.timestamp,
    title: item.title,
    description: item.description,
    closer: closerForTimelineType(item, recipientName)
  }));
}

function scoreTimelineItem(item: TimelineItem): number {
  let score = 0;
  if (item.severity === "alert") score += 5;
  if (item.severity === "watch") score += 3;
  if (item.type === "meeting summary") score += 2;
  if (item.type === "care signal") score += 2;
  if (item.type === "voice update") score += 1;
  score += new Date(item.timestamp).getTime() / 1e13;
  return score;
}

function emojiForTimelineType(type: TimelineItem["type"], severity?: TimelineItem["severity"]): string {
  if (severity === "alert") return "🚨";
  if (severity === "watch") return "👀";
  switch (type) {
    case "appointment":
      return "🩺";
    case "task":
      return "✅";
    case "voice update":
      return "🎙️";
    case "meeting summary":
      return "👨‍👩‍👧";
    case "care signal":
      return "📡";
    case "document":
      return "📄";
    default:
      return "💙";
  }
}

function closerForTimelineType(item: TimelineItem, recipientName: string): string {
  if (item.severity === "alert") return "You caught it. That mattered.";
  if (item.type === "meeting summary") return "You helped the family decide together.";
  if (item.type === "appointment") return `You made sure ${recipientName} was where she needed to be.`;
  if (item.type === "voice update") return "Small notes, real attention.";
  return "We remember this one.";
}

function buildShareCaption({
  memberName,
  totalDaysActive,
  totalTasksDone,
  recipientName
}: {
  memberName: string;
  totalDaysActive: number;
  totalTasksDone: number;
  recipientName: string;
}): string {
  return `${totalDaysActive} days. ${totalTasksDone} tasks. One grateful family. Here's ${memberName}'s Tandem Caregiver Wrapped — a thank-you for showing up for ${recipientName}. #CaregiverWrapped`;
}

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
