import type { TaskCategory } from "@/lib/types";

export type WrappedComparison = {
  id: string;
  emoji: string;
  headline: string;
  bullets: string[];
  closer?: string;
};

export type WrappedKeyMoment = {
  id: string;
  emoji: string;
  date: string;
  title: string;
  description: string;
  closer?: string;
};

export type WrappedCriticalMoment = {
  emoji: string;
  count: number;
  label: string;
};

export type WrappedSnapshot = {
  wrappedId: string;
  memberId: string;
  memberName: string;
  recipientName: string;
  serviceStart: string;
  serviceEnd: string;
  totalDaysActive: number;
  totalTasksDone: number;
  totalTasksClaimed: number;
  averageTasksPerDay: number;
  medicationOnTimeRatio: number;
  nightShiftCount: number;
  emergencyResponseCount: number;
  longestStreakDays: number;
  topCategory: TaskCategory | "general care";
  topCategoryShare: number;
  criticalMoments: WrappedCriticalMoment[];
  comparisons: WrappedComparison[];
  keyMomentsTitle: string;
  keyMoments: WrappedKeyMoment[];
  circleStartedOn: string;
  shareCaption: string;
  seed: number;
};
