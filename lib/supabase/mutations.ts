import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { DocumentRecord, Handover, Task, TimelineItem } from "@/lib/types";

const CARE_CIRCLE_ID = "circle-mum";

function dropUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

export async function persistDocument(document: DocumentRecord) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from("documents").upsert({
    id: document.id,
    care_circle_id: CARE_CIRCLE_ID,
    document_type: document.documentType,
    title: document.title,
    summary: document.summary,
    uploaded_by_id: document.uploadedById,
    uploaded_at: document.uploadedAt,
    storage_path: document.storagePath,
    important_dates: document.importantDates,
    institutions: document.institutions,
    care_items: document.careItems
  });

  if (error) throw error;
  return true;
}

export async function persistTasks(tasks: Task[]) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from("tasks").upsert(
    tasks.map((task) =>
      dropUndefined({
        id: task.id,
        care_circle_id: CARE_CIRCLE_ID,
        title: task.title,
        category: task.category,
        assignee_id: task.assigneeId,
        due_date: task.dueDate,
        status: task.status,
        priority: task.priority,
        linked_record_id: task.linkedRecordId,
        linked_timeline_id: task.linkedTimelineId,
        notes: task.notes
      })
    )
  );

  if (error) throw error;
  return true;
}

export async function updatePersistedTask(taskId: string, patch: Partial<Task>) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from("tasks")
    .update(
      dropUndefined({
        title: patch.title,
        category: patch.category,
        assignee_id: patch.assigneeId,
        due_date: patch.dueDate,
        status: patch.status,
        priority: patch.priority,
        linked_record_id: patch.linkedRecordId,
        linked_timeline_id: patch.linkedTimelineId,
        notes: patch.notes,
        updated_at: new Date().toISOString()
      })
    )
    .eq("id", taskId);

  if (error) throw error;
  return true;
}

export async function persistTimelineItem(item: TimelineItem) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from("timeline_items").upsert(
    dropUndefined({
      id: item.id,
      care_circle_id: CARE_CIRCLE_ID,
      type: item.type,
      title: item.title,
      description: item.description,
      author_id: item.authorId,
      timestamp: item.timestamp,
      linked_task_ids: item.linkedTaskIds ?? [],
      linked_record_id: item.linkedRecordId,
      severity: item.severity
    })
  );

  if (error) throw error;
  return true;
}

export async function persistHandover(handover: Handover) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from("handovers").upsert({
    id: handover.id,
    care_circle_id: CARE_CIRCLE_ID,
    created_at: handover.createdAt,
    range_label: handover.rangeLabel,
    current_situation: handover.currentSituation,
    upcoming_appointments: handover.upcomingAppointments,
    active_tasks: handover.activeTasks,
    medication_reminders: handover.medicationReminders,
    unresolved_admin: handover.unresolvedAdmin,
    recent_concerns: handover.recentConcerns,
    who_is_doing_what: handover.whoIsDoingWhat,
    suggested_next_actions: handover.suggestedNextActions
  });

  if (error) throw error;
  return true;
}
