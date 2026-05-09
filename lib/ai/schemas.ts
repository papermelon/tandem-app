import { z } from "zod";

export const taskCategorySchema = z.enum([
  "appointment",
  "transport",
  "medication",
  "admin",
  "finance",
  "check-in",
  "home safety"
]);

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const recommendedTaskSchema = z.object({
  title: z.string(),
  category: taskCategorySchema,
  suggested_assignee: z.string(),
  due_date: z.string(),
  priority: taskPrioritySchema
});

export const extractionSchema = z.object({
  document_type: z.string(),
  plain_english_summary: z.string(),
  important_dates: z.array(z.string()),
  people_or_institutions: z.array(z.string()),
  medications_or_care_items: z.array(z.string()),
  recommended_tasks: z.array(recommendedTaskSchema),
  family_update_message: z.string()
});

export const handoverSchema = z.object({
  current_situation: z.string(),
  upcoming_appointments: z.array(z.string()),
  active_tasks: z.array(z.string()),
  medication_care_reminders: z.array(z.string()),
  unresolved_admin_matters: z.array(z.string()),
  recent_concerns: z.array(z.string()),
  who_is_doing_what: z.array(z.string()),
  suggested_next_actions: z.array(z.string())
});

export const meetingSchema = z.object({
  summary: z.string(),
  decisions_made: z.array(z.string()),
  assigned_tasks: z.array(
    z.object({
      title: z.string(),
      assignee: z.string(),
      category: taskCategorySchema,
      due_date: z.string(),
      priority: taskPrioritySchema
    })
  ),
  open_questions: z.array(z.string()),
  unresolved_risks: z.array(z.string()),
  follow_up_reminders: z.array(z.string())
});

export const voiceSchema = z.object({
  update_note: z.string(),
  suggested_task: recommendedTaskSchema,
  reminder: z.string(),
  family_message: z.string(),
  transcript: z.string()
});
