export type MemberRole = "primary" | "family" | "fdw";
export type Language = "English" | "Tagalog" | "Bahasa" | "Burmese";
export type SectionKey =
  | "meds"
  | "mobility"
  | "mood"
  | "diet"
  | "appointments"
  | "emergency";

export type EvidenceRef =
  | { type: "ingestion"; id: string; label: string }
  | { type: "diary"; id: string; label: string }
  | { type: "version"; id: string; label: string };

export interface Member {
  id: string;
  tanId: string;
  displayName: string;
  role: MemberRole;
  language: Language;
}

export interface Tandom {
  tanId: string;
  name: string;
  createdAt: string;
  inviteToken: string;
  memberIds: string[];
}

export interface GroundTruthSection {
  title: string;
  value: string;
  lastConfirmedAt: string;
}

export interface GroundTruthDecisionRecord {
  decisionId: string;
  tanId: string;
  createdAt: string;
  createdBy: string;
  conflictType: string;
  field: string;
  candidates: string[];
  chosen: string;
  rationale: string;
  evidenceRefs: EvidenceRef[];
  impactedVersionIds: string[];
}

export interface GroundTruthVersion {
  versionId: string;
  tanId: string;
  createdAt: string;
  createdBy: string;
  sections: Record<SectionKey, GroundTruthSection>;
  decisionRefs: string[];
  diffSummary: string;
}

export interface HandoverReceipt {
  reviewedSections: string[];
  notes: string;
  decisionRefs: string[];
}

export interface HandoverSession {
  sessionId: string;
  tanId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  scanToken: string;
  scannedBy?: string;
  completedAt?: string;
  checklistState: Record<string, boolean>;
  receipt?: HandoverReceipt;
}

export type TaskStatus = "open" | "claimed" | "done";

export interface Task {
  taskId: string;
  tanId: string;
  title: string;
  dueAt: string;
  assignedTo: string;
  status: TaskStatus;
  createdBy: string;
  createdAt: string;
}

export interface DiaryEntry {
  entryId: string;
  tanId: string;
  text: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
}

export type DraftType = "photo" | "voice";

export interface ExtractedField {
  field: SectionKey;
  proposedValue: string;
  verified: boolean;
}

export interface IngestionDraft {
  draftId: string;
  tanId: string;
  type: DraftType;
  rawAssetRef: string;
  createdAt: string;
  extractedFields: ExtractedField[];
  verificationState: "pending" | "ready" | "committed";
}

export type NotificationType =
  | "task_assigned"
  | "task_due"
  | "task_overdue"
  | "handover_started"
  | "handover_pending"
  | "ground_truth_updated";

export interface InAppNotification {
  notificationId: string;
  tanId: string;
  createdAt: string;
  type: NotificationType;
  payload: {
    title: string;
    body: string;
    relatedId?: string;
  };
  actorId: string;
  readAt?: string;
}

export interface QueryCitation {
  label: string;
  type: "ground_truth" | "decision" | "task" | "diary" | "handover" | "draft";
  recordId: string;
}

export interface QueryAnswer {
  answer: string;
  citations: QueryCitation[];
  followUp?: string;
}

export interface TandemState {
  tandom: Tandom;
  members: Member[];
  groundTruthVersions: GroundTruthVersion[];
  decisionRecords: GroundTruthDecisionRecord[];
  handoverSessions: HandoverSession[];
  tasks: Task[];
  diaryEntries: DiaryEntry[];
  ingestionDrafts: IngestionDraft[];
  notifications: InAppNotification[];
  activeMemberId: string;
}
