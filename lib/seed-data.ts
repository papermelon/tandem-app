import { offsetDate } from "@/lib/date";
import type { AppData, CareLoadCategory, CareSignal, DocumentRecord, FamilyMember, Handover, Task, TimelineItem } from "@/lib/types";

export const members: FamilyMember[] = [
  {
    id: "rachel",
    name: "Rachel",
    role: "Default caregiver",
    avatar: "R",
    phone: "+65 9000 1122",
    isDefaultCaregiver: true
  },
  {
    id: "ming",
    name: "Ming",
    role: "Sibling",
    avatar: "M",
    phone: "+65 9111 2233"
  },
  {
    id: "lina",
    name: "Lina",
    role: "Sibling",
    avatar: "L",
    phone: "+65 9222 3344"
  }
];

export function createSeedData(): AppData {
  const tasks: Task[] = [
    {
      id: "task-rehab-transport",
      title: "Confirm transport for SGH rehab appointment",
      category: "transport",
      dueDate: offsetDate(1, 8, 30),
      status: "unclaimed",
      priority: "high",
      linkedTimelineId: "tl-rehab",
      notes: "Appointment starts at 10:30am. Mum needs help getting from the taxi drop-off to rehab."
    },
    {
      id: "task-med-refill",
      title: "Refill donepezil and blood pressure medication",
      category: "medication",
      assigneeId: "rachel",
      dueDate: offsetDate(2, 18, 0),
      status: "claimed",
      priority: "medium",
      linkedTimelineId: "tl-medication"
    },
    {
      id: "task-hdb-ease",
      title: "Upload HDB EASE contractor quote",
      category: "admin",
      dueDate: offsetDate(3, 20, 0),
      status: "unclaimed",
      priority: "medium",
      linkedRecordId: "doc-hdb-ease"
    },
    {
      id: "task-aic-call",
      title: "Call AIC about interim caregiving grant eligibility",
      category: "admin",
      assigneeId: "lina",
      dueDate: offsetDate(4, 12, 0),
      status: "claimed",
      priority: "medium",
      linkedRecordId: "doc-aic-letter"
    },
    {
      id: "task-polyclinic-review",
      title: "Book polyclinic review after fall follow-up",
      category: "appointment",
      assigneeId: "rachel",
      dueDate: offsetDate(5, 10, 0),
      status: "claimed",
      priority: "medium"
    },
    {
      id: "task-helper-roster",
      title: "Check helper roster for night medication reminder",
      category: "medication",
      dueDate: offsetDate(0, 21, 0),
      status: "unclaimed",
      priority: "medium"
    },
    {
      id: "task-rehab-bill",
      title: "Pay rehab invoice and upload receipt",
      category: "finance",
      assigneeId: "ming",
      dueDate: offsetDate(6, 17, 0),
      status: "claimed",
      priority: "low"
    },
    {
      id: "task-morning-check",
      title: "Morning video check-in after unusual movement alert",
      category: "check-in",
      assigneeId: "rachel",
      dueDate: offsetDate(0, 11, 0),
      status: "done",
      priority: "high",
      linkedTimelineId: "tl-no-movement"
    },
    {
      id: "task-grab-bars",
      title: "Schedule bathroom grab bar installation",
      category: "home safety",
      assigneeId: "lina",
      dueDate: offsetDate(8, 14, 0),
      status: "blocked",
      priority: "medium",
      linkedRecordId: "doc-hdb-ease",
      notes: "Waiting for HDB EASE confirmation letter."
    },
    {
      id: "task-memory-questions",
      title: "Prepare questions for memory clinic review",
      category: "appointment",
      assigneeId: "rachel",
      dueDate: offsetDate(7, 19, 0),
      status: "claimed",
      priority: "medium"
    }
  ];

  const timeline: TimelineItem[] = [
    {
      id: "tl-rehab",
      type: "appointment",
      title: "Rehab appointment tomorrow, 10:30am",
      description: "SGH outpatient rehab confirmed. Please arrive 20 minutes early for registration.",
      authorId: "rachel",
      timestamp: offsetDate(-1, 18, 12),
      linkedTaskIds: ["task-rehab-transport"]
    },
    {
      id: "tl-medication",
      type: "task",
      title: "Medication refill due in 2 days",
      description: "Pharmacy says donepezil stock is available. Rachel has the prescription photo.",
      authorId: "rachel",
      timestamp: offsetDate(-1, 15, 20),
      linkedTaskIds: ["task-med-refill"]
    },
    {
      id: "tl-hdb",
      type: "document",
      title: "HDB EASE application letter uploaded",
      description: "Letter confirms request for grab bars and anti-slip bathroom treatment. Contractor quote still needed.",
      authorId: "lina",
      timestamp: offsetDate(-2, 20, 15),
      linkedTaskIds: ["task-hdb-ease", "task-grab-bars"],
      linkedRecordId: "doc-hdb-ease"
    },
    {
      id: "tl-no-movement",
      type: "care signal",
      title: "No usual morning movement detected by 10:30am",
      description: "Kitchen and hallway sensors were quiet longer than Mum's usual routine. Rachel completed a video check-in.",
      authorId: "rachel",
      timestamp: offsetDate(0, 10, 30),
      severity: "alert",
      linkedTaskIds: ["task-morning-check"]
    },
    {
      id: "tl-doctor-note",
      type: "note",
      title: "Doctor asked us to watch for dizziness",
      description: "After the recent fall, SGH doctor said to note dizzy spells, missed meals, and new confusion.",
      authorId: "rachel",
      timestamp: offsetDate(-3, 13, 40)
    },
    {
      id: "tl-meeting",
      type: "meeting summary",
      title: "Family call summary",
      description: "Agreed to split transport, admin, and medication reminders more clearly for the next two weeks.",
      authorId: "ming",
      timestamp: offsetDate(-4, 21, 5)
    },
    {
      id: "tl-voice",
      type: "voice update",
      title: "Voice note: Mum walked slower today",
      description: "Rachel noticed Mum taking smaller steps after lunch. No pain reported, but worth mentioning at rehab.",
      authorId: "rachel",
      timestamp: offsetDate(-2, 14, 5)
    },
    {
      id: "tl-aic",
      type: "document",
      title: "AIC grant letter received",
      description: "Letter requests income documents and a caregiver declaration before the next review.",
      authorId: "lina",
      timestamp: offsetDate(-5, 19, 25),
      linkedTaskIds: ["task-aic-call"],
      linkedRecordId: "doc-aic-letter"
    }
  ];

  const documents: DocumentRecord[] = [
    {
      id: "doc-hdb-ease",
      documentType: "HDB EASE letter",
      title: "HDB EASE application letter",
      summary: "HDB acknowledged the EASE application for bathroom grab bars and anti-slip flooring. A contractor quote is needed for the next step.",
      uploadedById: "lina",
      uploadedAt: offsetDate(-2, 20, 10),
      importantDates: [offsetDate(3, 17, 0)],
      institutions: ["HDB", "EASE"],
      careItems: ["Grab bars", "Anti-slip bathroom treatment"]
    },
    {
      id: "doc-aic-letter",
      documentType: "AIC grant letter",
      title: "AIC grant follow-up letter",
      summary: "AIC requested supporting income documents and a signed caregiver declaration.",
      uploadedById: "lina",
      uploadedAt: offsetDate(-5, 19, 15),
      importantDates: [offsetDate(10, 17, 0)],
      institutions: ["AIC"],
      careItems: ["Caregiver declaration", "Income documents"]
    }
  ];

  const careSignals: CareSignal[] = [
    {
      id: "signal-kitchen",
      label: "Kitchen motion detected",
      description: "Usual breakfast movement at 8:12am",
      timestamp: offsetDate(0, 8, 12),
      severity: "normal"
    },
    {
      id: "signal-meds",
      label: "Medication drawer opened",
      description: "Drawer opened at 9:04am during the normal reminder window",
      timestamp: offsetDate(0, 9, 4),
      severity: "normal"
    },
    {
      id: "signal-no-movement",
      label: "No usual morning movement detected",
      description: "No kitchen or hallway movement by 10:30am",
      timestamp: offsetDate(0, 10, 30),
      severity: "alert"
    },
    {
      id: "signal-bp",
      label: "Blood pressure photo recorded",
      description: "Photo uploaded for family review, not clinical interpretation",
      timestamp: offsetDate(-1, 20, 6),
      severity: "watch"
    },
    {
      id: "signal-door",
      label: "Front door opened",
      description: "Front door opened at 7:45am, likely helper arrival",
      timestamp: offsetDate(0, 7, 45),
      severity: "normal"
    }
  ];

  const handovers: Handover[] = [
    {
      id: "handover-demo",
      createdAt: offsetDate(-1, 22, 0),
      rangeLabel: "Next 7 days",
      currentSituation: "Mum is recovering from a recent fall and has mild dementia. Rehab, medication refill, and HDB EASE admin are the main coordination points.",
      upcomingAppointments: ["SGH rehab tomorrow at 10:30am", "Polyclinic review to be booked"],
      activeTasks: ["Confirm transport", "Refill medication", "Upload contractor quote"],
      medicationReminders: ["Medication refill due in 2 days", "Night reminder coverage needs helper roster confirmation"],
      unresolvedAdmin: ["HDB EASE contractor quote", "AIC caregiver declaration"],
      recentConcerns: ["No usual morning movement detected today; Rachel completed video check-in"],
      whoIsDoingWhat: ["Rachel: medication and appointment prep", "Ming: rehab invoice", "Lina: AIC and HDB paperwork"],
      suggestedNextActions: ["Assign rehab transport", "Confirm AIC documents", "Keep rehab notes in timeline"]
    }
  ];

  const loadCategories: CareLoadCategory[] = [
    { category: "appointment", counts: { rachel: 4, ming: 1, lina: 1 } },
    { category: "transport", counts: { rachel: 3, ming: 1, lina: 0 } },
    { category: "admin", counts: { rachel: 2, ming: 0, lina: 3 } },
    { category: "medication", counts: { rachel: 5, ming: 0, lina: 1 } },
    { category: "check-in", counts: { rachel: 4, ming: 2, lina: 1 } },
    { category: "finance", counts: { rachel: 1, ming: 2, lina: 0 } },
    { category: "document handling", counts: { rachel: 2, ming: 0, lina: 3 } }
  ];

  return {
    members,
    recipient: {
      id: "mum",
      name: "Mum",
      age: 78,
      context: "Mild dementia, recent fall, rehab follow-up",
      address: "Ang Mo Kio HDB flat",
      careCircleId: "circle-mum"
    },
    tasks,
    timeline,
    documents,
    careSignals,
    handovers,
    loadCategories
  };
}
