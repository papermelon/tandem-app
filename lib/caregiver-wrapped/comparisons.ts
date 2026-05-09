import type { WrappedSnapshot, WrappedComparison } from "@/lib/caregiver-wrapped/types";

type ComparisonBuilder = (snap: WrappedSnapshot) => WrappedComparison | null;

export const comparisonBuilders: ComparisonBuilder[] = [
  (s) =>
    s.medicationOnTimeRatio > 0
      ? {
          id: "med-adherence",
          emoji: "💊",
          headline: `Your medication on-time rate: ${Math.round(s.medicationOnTimeRatio * 1000) / 10}%`,
          bullets: [
            "🅿️ People who remember where they parked (≈82%)",
            "💍 Marriages lasting 20+ years (≈52%)",
            "⏰ Your ability to be on time (we won't check)"
          ],
          closer: "Basically, you're reliable. Unlike the rest of us. 😅"
        }
      : null,

  (s) =>
    s.nightShiftCount > 0
      ? {
          id: "night-shifts",
          emoji: "🌙",
          headline: `${s.nightShiftCount} night-shift moments`,
          bullets: [
            "Late check-ins, midnight reminders, 3am worries.",
            "You've worked enough graveyard shifts to know why vampires are grumpy.",
            "Most people only see this hour by accident."
          ],
          closer: "The quiet hours had you in them."
        }
      : null,

  (s) =>
    s.longestStreakDays > 1
      ? {
          id: "streak",
          emoji: "🔥",
          headline: `${s.longestStreakDays}-day streak without missing a beat`,
          bullets: [
            "Most New Year's resolutions: 14 days.",
            "Most gym memberships: 3 weeks.",
            `${s.recipientName}'s care: every single one of those days.`
          ],
          closer: "Consistency is a love language."
        }
      : null,

  (s) =>
    s.topCategoryShare > 0
      ? {
          id: "specialty",
          emoji: "🎯",
          headline: `Your specialty: ${s.topCategory} (${Math.round(s.topCategoryShare * 100)}% of your tasks)`,
          bullets: [
            "You learned the workflow, the people, the tiny details.",
            "If anyone asked, you knew the answer.",
            "Specialist energy without the wall plaque."
          ],
          closer: "This is what showing up looks like."
        }
      : null,

  (s) =>
    s.totalDaysActive > 0
      ? {
          id: "days-of-service",
          emoji: "📅",
          headline: `${s.totalDaysActive} days of service`,
          bullets: [
            `That's ${Math.max(1, Math.round(s.totalDaysActive / 7))} weeks of being on call.`,
            "More consecutive days than most people commit to a Netflix series.",
            "And you didn't get to skip the hard episodes."
          ]
        }
      : null,

  (s) =>
    s.totalTasksDone > 0
      ? {
          id: "task-volume",
          emoji: "✅",
          headline: `${s.totalTasksDone} tasks completed`,
          bullets: [
            "More than a medieval baker had ovens.",
            `That's ${s.averageTasksPerDay.toFixed(1)} tasks every day on average.`,
            "Each one a small act of love disguised as logistics."
          ]
        }
      : null,

  (s) =>
    s.emergencyResponseCount > 0
      ? {
          id: "emergencies",
          emoji: "🚑",
          headline: `${s.emergencyResponseCount} high-priority moments handled`,
          bullets: [
            "When the urgent stuff hit, you moved.",
            "Paramedic-level calm, family-level love.",
            "No badge, all the responsibility."
          ]
        }
      : null
];

export function pickComparisons(snap: WrappedSnapshot, count: number, seed: number): WrappedComparison[] {
  const candidates = comparisonBuilders
    .map((build) => build(snap))
    .filter((value): value is WrappedComparison => value !== null);

  if (candidates.length === 0) {
    return [
      {
        id: "fallback",
        emoji: "❤️",
        headline: "You showed up.",
        bullets: [
          "Even the days that didn't make the timeline counted.",
          "Care isn't always measurable.",
          "But it's always felt."
        ]
      }
    ];
  }

  const rng = mulberry32(seed);
  const shuffled = [...candidates].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
