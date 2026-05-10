import { offsetDate } from "@/lib/date";
import type { ExtractionResult, MeetingResult, VoiceResult } from "@/lib/types";

export function mockExtraction(): ExtractionResult {
  return {
    document_type: "SGH doctor memo",
    plain_english_summary:
      "Ah Muay should continue rehab after her recent fall. The memo asks the family to watch for dizziness, missed medication, and new confusion, and to bring her medication list to the next visit.",
    important_dates: [offsetDate(1, 10, 30), offsetDate(7, 9, 0)],
    people_or_institutions: ["SGH outpatient rehab", "Polyclinic", "lead caregiver", "Ming", "Lina"],
    medications_or_care_items: ["Donepezil", "Blood pressure medication", "Rehab exercises", "Walking aid"],
    recommended_tasks: [
      {
        title: "Confirm transport and wheelchair-friendly drop-off for SGH rehab",
        category: "transport",
        suggested_assignee: "Ming",
        due_date: offsetDate(1, 8, 30),
        priority: "high"
      },
      {
        title: "Upload updated medication list before rehab review",
        category: "medication",
        suggested_assignee: "lead caregiver",
        due_date: offsetDate(2, 20, 0),
        priority: "medium"
      },
      {
        title: "Check whether AIC grant paperwork needs the latest doctor memo",
        category: "admin",
        suggested_assignee: "Lina",
        due_date: offsetDate(3, 18, 0),
        priority: "medium"
      }
    ],
    family_update_message:
      "Doctor memo added. Main follow-ups: confirm rehab transport, bring the medication list, and keep an eye on dizziness or new confusion."
  };
}

export function mockHandover(rangeLabel: string) {
  return {
    current_situation:
      "Ah Muay is 78, has mild dementia, and is recovering from a recent fall. The immediate focus is rehab attendance, medication refill, and keeping family context visible while the lead caregiver is carrying most coordination.",
    upcoming_appointments: ["SGH rehab tomorrow at 10:30am", "Polyclinic follow-up needs booking", "Memory clinic questions are being prepared"],
    active_tasks: [
      "Confirm transport for SGH rehab",
      "Refill donepezil and blood pressure medication",
      "Upload HDB EASE contractor quote",
      "Call AIC about grant eligibility"
    ],
    medication_care_reminders: [
      "Medication refill is due in 2 days",
      "Helper roster needs confirmation for night medication reminder",
      "Medication notes are reminders only and not clinical recommendations"
    ],
    unresolved_admin_matters: ["HDB EASE contractor quote", "AIC caregiver declaration", "Income documents for AIC review"],
    recent_concerns: [
      "No usual morning movement detected by 10:30am today; the lead caregiver completed a video check-in",
      "Ah Muay walked slower after lunch earlier this week"
    ],
    who_is_doing_what: ["Lead caregiver: medication and appointment prep", "Ming: rehab invoice and possible transport", "Lina: AIC and HDB admin"],
    suggested_next_actions: [
      `Use this ${rangeLabel.toLowerCase()} handover as the source of truth`,
      "Assign rehab transport before tonight",
      "Ask Lina to confirm which AIC documents are still missing"
    ]
  };
}

export function mockMeeting(): MeetingResult {
  return {
    summary:
      "The family agreed that the lead caregiver needs clearer backup for transport and admin work. Ming can help with transport on some mornings, and Lina can own HDB EASE and AIC paperwork.",
    decisions_made: [
      "Ming will try to cover the next SGH rehab transport task.",
      "Lina will follow up on the HDB EASE contractor quote.",
      "The lead caregiver will keep medication refill reminders in Tandem."
    ],
    assigned_tasks: [
      {
        title: "Check if Ming can cover SGH rehab transport",
        assignee: "Ming",
        category: "transport",
        due_date: offsetDate(1, 8, 30),
        priority: "high"
      },
      {
        title: "Follow up on HDB EASE contractor quote",
        assignee: "Lina",
        category: "admin",
        due_date: offsetDate(3, 18, 0),
        priority: "medium"
      },
      {
        title: "Update medication refill reminder after pharmacy call",
        assignee: "lead caregiver",
        category: "medication",
        due_date: offsetDate(2, 18, 0),
        priority: "medium"
      }
    ],
    open_questions: ["Who can be backup if Ah Muay refuses rehab transport?", "Do we need the latest SGH memo for the AIC file?"],
    unresolved_risks: [
      "Transport coverage may be tight on weekday mornings.",
      "Admin documents may sit with one person unless tasks are split clearly."
    ],
    follow_up_reminders: ["Review task ownership after the next rehab session.", "Upload any new letters before the next family call."]
  };
}

export function mockVoice(transcript?: string): VoiceResult {
  return {
    transcript:
      transcript ||
      "I just spoke to the doctor. Ah Muay should bring the medication list to rehab, and we should watch for dizziness this week.",
    update_note:
      "Doctor asked the family to bring Ah Muay's medication list to rehab and keep an eye on dizziness during the week.",
    suggested_task: {
      title: "Bring updated medication list to rehab",
      category: "medication",
      suggested_assignee: "lead caregiver",
      due_date: offsetDate(1, 9, 0),
      priority: "medium"
    },
    reminder: "Check medication list tonight before SGH rehab.",
    family_message:
      "Doctor update: please bring Ah Muay's medication list to rehab and note any dizziness or new confusion this week."
  };
}
