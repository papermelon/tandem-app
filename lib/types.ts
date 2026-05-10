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

export type Permission =
  | "see_care_history"
  | "get_notified_care_updates"
  | "create_tasks"
  | "edit_patient_profile"
  | "manage_permissions"
  | "invite_others"
  | "view_documents"
  | "edit_care_notes";

export type PermissionSet = Record<Permission, boolean>;

export type CircleRole = "primary_caregiver" | "family_member" | "temporary_caregiver";

export type FamilyMember = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  phone?: string;
  email?: string;
  isDefaultCaregiver?: boolean;
  categoryPreferences?: TaskCategory[];
  loadCapacityPct?: number;
  circleRole?: CircleRole;
  permissions?: PermissionSet;
  accessExpiresAt?: string;
  invitedAt?: string;
  invitedById?: string;
};

export type RoutingCandidate = {
  memberId: string;
  score: number;
  loadPct: number;
  reasons: string[];
  components: {
    categoryAffinity: number;
    inverseLoad: number;
    explicitPref: number;
    proximity: number;
    defaultBias: number;
  };
};

export type RoutingContext = {
  members: FamilyMember[];
  tasks: Task[];
  now?: Date;
};

export type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
};

export type CareRecipient = {
  id: string;
  name: string;
  age: number;
  context: string;
  address: string;
  careCircleId: string;
  relationship?: string;
  country?: string;
  avatar?: string;
  medicalConditions?: string[];
  allergies?: string[];
  currentMedications?: string[];
  emergencyContacts?: EmergencyContact[];
  language?: string;
};

export type CaregiverProfile = {
  id: string;
  name: string;
  avatar?: string;
  language?: string;
  circleId: string;
};

export type HandoverQRPayload = {
  v: 1;
  careRecipientId: string;
  careRecipientName: string;
  circleId: string;
  fromCircleLabel?: string;
  issuedAt: number;
  ciphertext?: string;
  iv?: string;
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

export type HandoverStatus = "pending" | "in-progress" | "completed" | "expired" | "cancelled";

export type HandoverImage = {
  id: string;
  url: string;
  caption?: string;
  timestamp?: string;
  uploaderId?: string;
};

export type HandoverHistoryEntry = {
  id: string;
  date: string;
  title: string;
  note?: string;
  images?: HandoverImage[];
};

export type HandoverAppointment = {
  id: string;
  date: string;
  title: string;
  time?: string;
  location?: string;
};

export type HandoverCaregiverRef = {
  memberId: string;
  name: string;
  loadPct: number;
  phone?: string;
  available?: boolean;
};

export type HandoverChecklistItem = {
  id: string;
  label: string;
  description?: string;
  images?: HandoverImage[];
  completed?: boolean;
};

export type HandoverAcknowledgments = {
  briefing: boolean;
  history: boolean;
  appointments: boolean;
  caregivers: boolean;
  checklist: boolean;
};

export type HandoverSession = {
  id: string;
  circleId: string;
  careRecipientId: string;
  departingCaregiverId: string;
  incomingCaregiverId?: string;
  briefing: string;
  careHistory: HandoverHistoryEntry[];
  upcomingAppointments: HandoverAppointment[];
  otherCaregivers: HandoverCaregiverRef[];
  dailyChecklist: HandoverChecklistItem[];
  images: HandoverImage[];
  language: string;
  acknowledgments: HandoverAcknowledgments;
  fullyAcknowledgedAt?: string;
  status: HandoverStatus;
  simulated?: boolean;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
  archivedAt?: string;
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
  handoverSessions: HandoverSession[];
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
    suggested_assignees?: RoutingCandidate[];
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
