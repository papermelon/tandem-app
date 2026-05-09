export type TaskStatus = "unclaimed" | "claimed" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high";
export type TaskCategory =
  | "appointment"
  | "transport"
  | "medication"
  | "admin"
  | "finance"
  | "check-in"
  | "home safety";

export type TimelineType =
  | "note"
  | "document"
  | "appointment"
  | "task"
  | "voice update"
  | "meeting summary"
  | "care signal";

export type SignalSeverity = "normal" | "watch" | "alert";

export type FamilyMember = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  phone?: string;
  isDefaultCaregiver?: boolean;
};

export type CareRecipient = {
  id: string;
  name: string;
  age: number;
  context: string;
  address: string;
  careCircleId: string;
};

export type Task = {
  id: string;
  title: string;
  category: TaskCategory;
  assigneeId?: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  linkedRecordId?: string;
  linkedTimelineId?: string;
  notes?: string;
};

export type TimelineItem = {
  id: string;
  type: TimelineType;
  title: string;
  description: string;
  authorId: string;
  timestamp: string;
  linkedTaskIds?: string[];
  linkedRecordId?: string;
  severity?: SignalSeverity;
};

export type DocumentRecord = {
  id: string;
  documentType: string;
  title: string;
  summary: string;
  uploadedById: string;
  uploadedAt: string;
  storagePath?: string;
  importantDates: string[];
  institutions: string[];
  careItems: string[];
};

export type CaptureStatus = "processing" | "pending_review" | "saved" | "ignored" | "failed";
export type CaptureSourceType = "text" | "image" | "document" | "voice";
export type ExtractedItemStatus = "pending" | "approved" | "deleted";
export type ExtractedItemType = "appointment" | "task" | "medication" | "note" | "document" | "concern";

export type CaptureEvent = {
  id: string;
  platform: "telegram" | "web";
  sourceType: CaptureSourceType;
  senderName?: string;
  platformSenderId?: string;
  platformMessageId?: string;
  originalFilePath?: string;
  originalFileUrl?: string;
  originalFileName?: string;
  originalFileMimeType?: string;
  rawText?: string;
  extractedText?: string;
  aiSummary?: string;
  status: CaptureStatus;
  extractionJson?: ExtractionResult;
  createdAt: string;
  updatedAt: string;
  items: ExtractedItem[];
};

export type ExtractedItem = {
  id: string;
  captureEventId: string;
  type: ExtractedItemType;
  title: string;
  summary: string;
  status: ExtractedItemStatus;
  assignedToId?: string;
  dueAt?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  structuredData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CareSignal = {
  id: string;
  label: string;
  description: string;
  timestamp: string;
  severity: SignalSeverity;
};

export type Handover = {
  id: string;
  createdAt: string;
  rangeLabel: string;
  currentSituation: string;
  upcomingAppointments: string[];
  activeTasks: string[];
  medicationReminders: string[];
  unresolvedAdmin: string[];
  recentConcerns: string[];
  whoIsDoingWhat: string[];
  suggestedNextActions: string[];
};

export type CareLoadCategory = {
  category: TaskCategory | "document handling";
  counts: Record<string, number>;
};

export type AppData = {
  members: FamilyMember[];
  recipient: CareRecipient;
  tasks: Task[];
  timeline: TimelineItem[];
  documents: DocumentRecord[];
  careSignals: CareSignal[];
  handovers: Handover[];
  loadCategories: CareLoadCategory[];
};

export type ExtractionResult = {
  document_type: string;
  plain_english_summary: string;
  important_dates: string[];
  people_or_institutions: string[];
  medications_or_care_items: string[];
  recommended_tasks: Array<{
    title: string;
    category: TaskCategory;
    suggested_assignee: string;
    due_date: string;
    priority: TaskPriority;
  }>;
  family_update_message: string;
};

export type MeetingResult = {
  summary: string;
  decisions_made: string[];
  assigned_tasks: Array<{
    title: string;
    assignee: string;
    category: TaskCategory;
    due_date: string;
    priority: TaskPriority;
  }>;
  open_questions: string[];
  unresolved_risks: string[];
  follow_up_reminders: string[];
};

export type VoiceResult = {
  update_note: string;
  suggested_task: {
    title: string;
    category: TaskCategory;
    suggested_assignee: string;
    due_date: string;
    priority: TaskPriority;
  };
  reminder: string;
  family_message: string;
  transcript: string;
};
