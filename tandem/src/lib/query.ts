import {
  GroundTruthDecisionRecord,
  GroundTruthVersion,
  HandoverSession,
  IngestionDraft,
  QueryAnswer,
  QueryCitation,
  TandemState,
  Task,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

function includesAll(source: string, query: string) {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) {
    return false;
  }

  return tokens.every((token) => source.includes(token));
}

function citation(label: string, type: QueryCitation["type"], recordId: string): QueryCitation {
  return { label, type, recordId };
}

function searchGroundTruth(query: string, versions: GroundTruthVersion[]): QueryAnswer | null {
  const latest = versions[0];
  if (!latest) {
    return null;
  }

  const entries = Object.entries(latest.sections);
  const match = entries.find(([, section]) =>
    includesAll(`${section.title} ${section.value}`.toLowerCase(), query)
  );

  if (!match) {
    return null;
  }

  const [field, section] = match;
  return {
    answer: `${section.title}: ${section.value}`,
    citations: [
      citation(
        `Ground Truth ${latest.versionId} (${field}) updated ${formatDate(latest.createdAt)}`,
        "ground_truth",
        latest.versionId
      ),
    ],
  };
}

function searchDecision(query: string, decisions: GroundTruthDecisionRecord[]): QueryAnswer | null {
  const match = decisions.find((decision) =>
    includesAll(
      `${decision.conflictType} ${decision.field} ${decision.candidates.join(" ")} ${decision.chosen} ${decision.rationale}`.toLowerCase(),
      query
    )
  );

  if (!match) {
    return null;
  }

  return {
    answer: `Decision kept "${match.chosen}" because ${match.rationale}`,
    citations: [
      citation(`Decision Record ${match.decisionId}`, "decision", match.decisionId),
      ...match.impactedVersionIds.map((versionId) =>
        citation(`Impacted Ground Truth ${versionId}`, "ground_truth", versionId)
      ),
    ],
  };
}

function searchTask(query: string, tasks: Task[]): QueryAnswer | null {
  const match = tasks.find((task) =>
    includesAll(`${task.title} ${task.status} ${task.dueAt}`.toLowerCase(), query)
  );

  if (!match) {
    return null;
  }

  return {
    answer: `Task "${match.title}" is ${match.status} and due ${formatDate(match.dueAt)}.`,
    citations: [citation(`Task ${match.taskId}`, "task", match.taskId)],
  };
}

function searchDiary(query: string, entries: TandemState["diaryEntries"]): QueryAnswer | null {
  const match = entries.find((entry) =>
    includesAll(`${entry.text} ${entry.tags.join(" ")}`.toLowerCase(), query)
  );

  if (!match) {
    return null;
  }

  return {
    answer: match.text,
    citations: [citation(`Diary ${match.entryId}`, "diary", match.entryId)],
  };
}

function searchHandover(query: string, sessions: HandoverSession[]): QueryAnswer | null {
  const match = sessions.find((session) =>
    includesAll(
      `${session.receipt?.notes ?? ""} ${session.receipt?.reviewedSections.join(" ") ?? ""}`.toLowerCase(),
      query
    )
  );

  if (!match || !match.receipt) {
    return null;
  }

  return {
    answer: `Handover reviewed ${match.receipt.reviewedSections.join(", ")}. Notes: ${match.receipt.notes}`,
    citations: [citation(`Handover ${match.sessionId}`, "handover", match.sessionId)],
  };
}

function searchDraft(query: string, drafts: IngestionDraft[]): QueryAnswer | null {
  const match = drafts.find((draft) =>
    includesAll(
      `${draft.rawAssetRef} ${draft.extractedFields.map((field) => field.proposedValue).join(" ")}`.toLowerCase(),
      query
    )
  );

  if (!match) {
    return null;
  }

  return {
    answer: `Draft ${match.draftId} proposed ${match.extractedFields
      .map((field) => `${field.field}: ${field.proposedValue}`)
      .join("; ")}.`,
    citations: [citation(`Draft ${match.draftId}`, "draft", match.draftId)],
  };
}

export function answerQuery(state: TandemState, query: string): QueryAnswer {
  const normalized = query.trim().toLowerCase();
  const resolvers = [
    () => searchGroundTruth(normalized, state.groundTruthVersions),
    () => searchDecision(normalized, state.decisionRecords),
    () => searchTask(normalized, state.tasks),
    () => searchDiary(normalized, state.diaryEntries),
    () => searchHandover(normalized, state.handoverSessions),
    () => searchDraft(normalized, state.ingestionDrafts),
  ];

  for (const resolver of resolvers) {
    const result = resolver();
    if (result) {
      return result;
    }
  }

  return {
    answer: "I could not find that in your Tandem records.",
    citations: [],
    followUp:
      "Try adding a discharge photo, voice note, diary entry, or a clearer Ground Truth update so Tandem can cite it later.",
  };
}
