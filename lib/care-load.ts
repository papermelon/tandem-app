import type { AppData, CareLoadCategory, FamilyMember, Task, TimelineItem } from "@/lib/types";

const CARE_LOAD_CATEGORY_ORDER: CareLoadCategory["category"][] = [
  "appointment",
  "transport",
  "medication",
  "admin",
  "finance",
  "check-in",
  "home safety",
  "document handling"
];

export type MemberLoadSummary = FamilyMember & {
  count: number;
  sharePct: number;
};

export function computeCareLoadCategories(
  data: Pick<AppData, "members" | "tasks" | "timeline" | "documents">
): CareLoadCategory[] {
  const memberIds = new Set(data.members.map((member) => member.id));
  const tasksById = new Map(data.tasks.map((task) => [task.id, task]));
  const counts = new Map<CareLoadCategory["category"], Record<string, number>>();

  function ensure(category: CareLoadCategory["category"]) {
    const existing = counts.get(category);
    if (existing) return existing;
    const next = Object.fromEntries(data.members.map((member) => [member.id, 0])) as Record<string, number>;
    counts.set(category, next);
    return next;
  }

  function increment(category: CareLoadCategory["category"], memberId?: string) {
    if (!memberId || !memberIds.has(memberId)) return;
    const categoryCounts = ensure(category);
    categoryCounts[memberId] = (categoryCounts[memberId] ?? 0) + 1;
  }

  for (const task of data.tasks) {
    if (task.status === "unclaimed") continue;
    increment(task.category, task.assigneeId);
  }

  for (const item of data.timeline) {
    increment(categoryForTimelineItem(item, tasksById), item.authorId);
  }

  for (const document of data.documents) {
    increment("document handling", document.uploadedById);
  }

  return CARE_LOAD_CATEGORY_ORDER
    .map((category) => ({ category, counts: ensure(category) }))
    .filter((category) => Object.values(category.counts).some((count) => count > 0));
}

export function summarizeMemberLoad(
  members: FamilyMember[],
  loadCategories: CareLoadCategory[]
): MemberLoadSummary[] {
  const totals = members.map((member) => ({
    ...member,
    count: loadCategories.reduce((sum, category) => sum + (category.counts[member.id] ?? 0), 0),
    sharePct: 0
  }));
  const totalCount = totals.reduce((sum, member) => sum + member.count, 0);

  return totals.map((member) => ({
    ...member,
    sharePct: totalCount ? Math.round((member.count / totalCount) * 100) : 0
  }));
}

export function topCareLoadMember(summaries: MemberLoadSummary[]) {
  return [...summaries].sort((a, b) => b.count - a.count)[0] ?? null;
}

function categoryForTimelineItem(
  item: TimelineItem,
  tasksById: Map<string, Task>
): CareLoadCategory["category"] {
  if (item.type === "document") return "document handling";
  if (item.type === "appointment") return "appointment";
  if (item.type === "task") {
    const linkedTask = item.linkedTaskIds?.map((id) => tasksById.get(id)).find(Boolean);
    return linkedTask?.category ?? "admin";
  }
  if (item.type === "meeting summary") return "admin";
  return "check-in";
}
