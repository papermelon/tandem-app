import type {
  FamilyMember,
  RoutingCandidate,
  RoutingContext,
  Task,
  TaskCategory,
  TaskPriority
} from "./types";

export const ROUTING_WEIGHTS = {
  categoryAffinity: 0.35,
  inverseLoad: 0.3,
  explicitPref: 0.2,
  proximity: 0.1,
  defaultBias: 0.05
} as const;

export const ROUTING_SCORE_FLOOR = 0.4;
export const PROXIMITY_HORIZON_DAYS = 7;
export const LOAD_WINDOW_DAYS = 7;
export const DEFAULT_LOAD_CAPACITY_PCT = 100;

type RankInput = {
  category?: TaskCategory;
  dueAt?: string;
  priority?: TaskPriority;
};

type Scored = {
  member: FamilyMember;
  components: RoutingCandidate["components"];
  loadPct: number;
  score: number;
};

export function rankAssignees(
  item: RankInput,
  context: RoutingContext,
  limit = 3
): RoutingCandidate[] {
  const now = context.now ?? new Date();
  const scored = context.members.map((member) =>
    scoreMember(member, item, context.tasks, now)
  );

  scored.sort((a, b) => b.score - a.score || tiebreak(a, b));

  return scored
    .filter((entry) => entry.score >= ROUTING_SCORE_FLOOR)
    .slice(0, limit)
    .map((entry) => ({
      memberId: entry.member.id,
      score: round(entry.score),
      loadPct: round(entry.loadPct * 100),
      reasons: buildReasons(entry, item),
      components: {
        categoryAffinity: round(entry.components.categoryAffinity),
        inverseLoad: round(entry.components.inverseLoad),
        explicitPref: round(entry.components.explicitPref),
        proximity: round(entry.components.proximity),
        defaultBias: round(entry.components.defaultBias)
      }
    }));
}

function scoreMember(
  member: FamilyMember,
  item: RankInput,
  tasks: Task[],
  now: Date
): Scored {
  const memberTasks = tasks.filter((task) => task.assigneeId === member.id);
  const categoryAffinity = item.category
    ? affinity(memberTasks, item.category)
    : 0;

  const loadPct = openLoadFraction(memberTasks, member, now);
  const inverseLoad = clamp01(1 - loadPct);

  const explicitPref =
    item.category && member.categoryPreferences?.includes(item.category) ? 1 : 0;

  const proximity = item.dueAt ? proximityScore(item.dueAt, now) : 0;
  const defaultBias = member.isDefaultCaregiver ? 1 : 0;

  const components = {
    categoryAffinity,
    inverseLoad,
    explicitPref,
    proximity,
    defaultBias
  };

  const score =
    components.categoryAffinity * ROUTING_WEIGHTS.categoryAffinity +
    components.inverseLoad * ROUTING_WEIGHTS.inverseLoad +
    components.explicitPref * ROUTING_WEIGHTS.explicitPref +
    components.proximity * ROUTING_WEIGHTS.proximity +
    components.defaultBias * ROUTING_WEIGHTS.defaultBias;

  return { member, components, loadPct, score };
}

function affinity(memberTasks: Task[], category: TaskCategory): number {
  const claimed = memberTasks.filter(
    (task) => task.status !== "unclaimed"
  );
  if (claimed.length === 0) return 0;
  const inCategory = claimed.filter((task) => task.category === category).length;
  return inCategory / claimed.length;
}

function openLoadFraction(
  memberTasks: Task[],
  member: FamilyMember,
  now: Date
): number {
  const horizon = addDays(now, LOAD_WINDOW_DAYS).getTime();
  const open = memberTasks.filter((task) => {
    if (task.status === "done") return false;
    const due = Date.parse(task.dueDate);
    return Number.isFinite(due) && due <= horizon;
  }).length;

  const capacityPct = member.loadCapacityPct ?? DEFAULT_LOAD_CAPACITY_PCT;
  // Capacity expressed as percent of a baseline of 5 open tasks per 100%.
  const capacity = Math.max(1, (capacityPct / 100) * 5);
  return clamp01(open / capacity);
}

function proximityScore(dueAt: string, now: Date): number {
  const due = Date.parse(dueAt);
  if (!Number.isFinite(due)) return 0;
  const days = (due - now.getTime()) / 86_400_000;
  if (days <= 0) return 1;
  if (days >= PROXIMITY_HORIZON_DAYS) return 0;
  return 1 - days / PROXIMITY_HORIZON_DAYS;
}

function buildReasons(entry: Scored, item: RankInput): string[] {
  const reasons: string[] = [];
  const { components, loadPct } = entry;

  if (components.categoryAffinity >= 0.4 && item.category) {
    reasons.push(
      `Owns ${Math.round(components.categoryAffinity * 100)}% of ${item.category} tasks`
    );
  }
  if (components.explicitPref === 1 && item.category) {
    reasons.push(`Opted in to ${item.category}`);
  }
  if (components.inverseLoad >= 0.6) {
    reasons.push(`Light load (${Math.round(loadPct * 100)}%)`);
  } else if (components.inverseLoad <= 0.2) {
    reasons.push(`Heavy load (${Math.round(loadPct * 100)}%)`);
  }
  if (components.proximity >= 0.7) {
    reasons.push("Due soon");
  }
  if (components.defaultBias === 1) {
    reasons.push("Default caregiver");
  }

  return reasons.length > 0 ? reasons : [`Best fit by score (${Math.round(entry.score * 100)}%)`];
}

function tiebreak(a: Scored, b: Scored): number {
  const aDefault = a.member.isDefaultCaregiver ? 1 : 0;
  const bDefault = b.member.isDefaultCaregiver ? 1 : 0;
  if (aDefault !== bDefault) return bDefault - aDefault;
  return a.loadPct - b.loadPct;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
