import { TandemState } from "@/lib/types";

export const defaultState: TandemState = {
  tandom: {
    tanId: "TAN-2048",
    name: "Tandom for Ah Ma",
    createdAt: "2026-05-09T08:00:00.000Z",
    inviteToken: "TAN-2048|INVITE|AHMA",
    memberIds: ["member-1", "member-2", "member-3"],
  },
  members: [
    {
      id: "member-1",
      tanId: "TAN-2048",
      displayName: "Grace",
      role: "primary",
      language: "English",
    },
    {
      id: "member-2",
      tanId: "TAN-2048",
      displayName: "Miguel",
      role: "family",
      language: "Tagalog",
    },
    {
      id: "member-3",
      tanId: "TAN-2048",
      displayName: "Lina",
      role: "fdw",
      language: "Bahasa",
    },
  ],
  groundTruthVersions: [
    {
      versionId: "gt-v2",
      tanId: "TAN-2048",
      createdAt: "2026-05-09T09:00:00.000Z",
      createdBy: "member-1",
      sections: {
        meds: {
          title: "Medication",
          value: "Amlodipine 10mg after breakfast. Calcium tablet at 8pm.",
          lastConfirmedAt: "2026-05-09T09:00:00.000Z",
        },
        mobility: {
          title: "Mobility",
          value: "Use gait belt for transfers. No stairs without two-person assist.",
          lastConfirmedAt: "2026-05-09T09:00:00.000Z",
        },
        mood: {
          title: "Mood",
          value: "Calmer after lunch and familiar Hokkien music.",
          lastConfirmedAt: "2026-05-09T09:00:00.000Z",
        },
        diet: {
          title: "Diet",
          value: "Soft foods only. Encourage warm water every 2 hours.",
          lastConfirmedAt: "2026-05-09T09:00:00.000Z",
        },
        appointments: {
          title: "Appointments",
          value: "Follow-up at Tan Tock Seng on 13 May, 3:30pm.",
          lastConfirmedAt: "2026-05-09T09:00:00.000Z",
        },
        emergency: {
          title: "Emergency",
          value: "If dizzy after meds, call Grace first, then clinic hotline.",
          lastConfirmedAt: "2026-05-09T09:00:00.000Z",
        },
      },
      decisionRefs: ["decision-1"],
      diffSummary: "Medication dosage increased from 5mg to 10mg after discharge review.",
    },
  ],
  decisionRecords: [
    {
      decisionId: "decision-1",
      tanId: "TAN-2048",
      createdAt: "2026-05-09T08:40:00.000Z",
      createdBy: "member-1",
      conflictType: "medication_schedule",
      field: "meds",
      candidates: [
        "Family note: Amlodipine 5mg after dinner.",
        "Discharge summary: Amlodipine 10mg after breakfast.",
      ],
      chosen: "Discharge summary: Amlodipine 10mg after breakfast.",
      rationale:
        "Primary caregiver aligned with latest hospital instruction and added dinner calcium separately.",
      evidenceRefs: [
        { type: "ingestion", id: "draft-1", label: "Discharge photo parse" },
        { type: "diary", id: "diary-1", label: "Family dinner note" },
      ],
      impactedVersionIds: ["gt-v2"],
    },
  ],
  handoverSessions: [
    {
      sessionId: "handover-1",
      tanId: "TAN-2048",
      createdBy: "member-1",
      createdAt: "2026-05-09T10:00:00.000Z",
      expiresAt: "2026-05-09T12:00:00.000Z",
      scanToken: "HANDOVER|TAN-2048|handover-1",
      scannedBy: "member-3",
      completedAt: "2026-05-09T10:20:00.000Z",
      checklistState: {
        Medication: true,
        Mobility: true,
        Mood: true,
        "Where supplies are": true,
      },
      receipt: {
        reviewedSections: ["Medication", "Mobility", "Mood", "Where supplies are"],
        notes: "Lina confirmed med tray layout and walker storage.",
        decisionRefs: ["decision-1"],
      },
    },
  ],
  tasks: [
    {
      taskId: "task-1",
      tanId: "TAN-2048",
      title: "8pm calcium tablet",
      dueAt: "2026-05-09T20:00:00.000Z",
      assignedTo: "member-3",
      status: "open",
      createdBy: "member-1",
      createdAt: "2026-05-09T09:05:00.000Z",
    },
    {
      taskId: "task-2",
      tanId: "TAN-2048",
      title: "Record blood pressure before breakfast",
      dueAt: "2026-05-10T07:30:00.000Z",
      assignedTo: "member-2",
      status: "claimed",
      createdBy: "member-1",
      createdAt: "2026-05-09T09:10:00.000Z",
    },
  ],
  diaryEntries: [
    {
      entryId: "diary-1",
      tanId: "TAN-2048",
      text: "Ah Ma asked for porridge early and was sleepy after dinner meds.",
      tags: ["appetite", "meds"],
      createdBy: "member-2",
      createdAt: "2026-05-08T19:30:00.000Z",
    },
  ],
  ingestionDrafts: [
    {
      draftId: "draft-1",
      tanId: "TAN-2048",
      type: "photo",
      rawAssetRef: "discharge-summary-may9.jpg",
      createdAt: "2026-05-09T08:30:00.000Z",
      extractedFields: [
        {
          field: "meds",
          proposedValue: "Amlodipine 10mg after breakfast.",
          verified: true,
        },
        {
          field: "appointments",
          proposedValue: "Follow-up at Tan Tock Seng on 13 May, 3:30pm.",
          verified: true,
        },
      ],
      verificationState: "committed",
    },
  ],
  notifications: [
    {
      notificationId: "notif-1",
      tanId: "TAN-2048",
      createdAt: "2026-05-09T10:00:00.000Z",
      type: "handover_started",
      payload: {
        title: "Handover started",
        body: "Grace opened a Trust Bridge handover for Lina.",
        relatedId: "handover-1",
      },
      actorId: "member-1",
    },
  ],
  activeMemberId: "member-1",
};
