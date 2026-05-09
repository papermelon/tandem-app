import { NextResponse } from "next/server";

import { createSeedData } from "@/lib/seed-data";
import { createSupabaseAdmin, hasSupabaseServerEnv } from "@/lib/supabase/server";
import type { AppData } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseServerEnv()) {
    return NextResponse.json({ data: createSeedData(), mockMode: true });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ data: createSeedData(), mockMode: true });
  }

  try {
    const [
      usersResult,
      recipientsResult,
      timelineResult,
      tasksResult,
      documentsResult,
      signalsResult,
      handoversResult
    ] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: true }),
      supabase.from("care_recipients").select("*").limit(1).single(),
      supabase.from("timeline_items").select("*").order("timestamp", { ascending: false }),
      supabase.from("tasks").select("*").order("due_date", { ascending: true }),
      supabase.from("documents").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("care_signals").select("*").order("timestamp", { ascending: false }),
      supabase.from("handovers").select("*").order("created_at", { ascending: false })
    ]);

    if (
      usersResult.error ||
      recipientsResult.error ||
      timelineResult.error ||
      tasksResult.error ||
      documentsResult.error ||
      signalsResult.error ||
      handoversResult.error
    ) {
      throw new Error("Supabase query failed");
    }

    const seed = createSeedData();
    const data: AppData = {
      members: (usersResult.data ?? seed.members).map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        isDefaultCaregiver: user.is_default_caregiver,
        categoryPreferences: user.category_preferences ?? [],
        loadCapacityPct: user.load_capacity_pct ?? 100
      })),
      recipient: recipientsResult.data
        ? {
            id: recipientsResult.data.id,
            name: recipientsResult.data.name,
            age: recipientsResult.data.age,
            context: recipientsResult.data.context,
            address: recipientsResult.data.address,
            careCircleId: recipientsResult.data.care_circle_id
          }
        : seed.recipient,
      timeline: (timelineResult.data ?? []).map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        authorId: item.author_id,
        timestamp: item.timestamp,
        linkedTaskIds: item.linked_task_ids,
        linkedRecordId: item.linked_record_id,
        severity: item.severity
      })),
      tasks: (tasksResult.data ?? []).map((task) => ({
        id: task.id,
        title: task.title,
        category: task.category,
        assigneeId: task.assignee_id,
        dueDate: task.due_date,
        status: task.status,
        priority: task.priority,
        linkedRecordId: task.linked_record_id,
        linkedTimelineId: task.linked_timeline_id,
        notes: task.notes
      })),
      documents: (documentsResult.data ?? []).map((document) => ({
        id: document.id,
        documentType: document.document_type,
        title: document.title,
        summary: document.summary,
        uploadedById: document.uploaded_by_id,
        uploadedAt: document.uploaded_at,
        storagePath: document.storage_path,
        importantDates: document.important_dates ?? [],
        institutions: document.institutions ?? [],
        careItems: document.care_items ?? []
      })),
      careSignals: (signalsResult.data ?? []).map((signal) => ({
        id: signal.id,
        label: signal.label,
        description: signal.description,
        timestamp: signal.timestamp,
        severity: signal.severity
      })),
      handovers: (handoversResult.data ?? []).map((handover) => ({
        id: handover.id,
        createdAt: handover.created_at,
        rangeLabel: handover.range_label,
        currentSituation: handover.current_situation,
        upcomingAppointments: handover.upcoming_appointments ?? [],
        activeTasks: handover.active_tasks ?? [],
        medicationReminders: handover.medication_reminders ?? [],
        unresolvedAdmin: handover.unresolved_admin ?? [],
        recentConcerns: handover.recent_concerns ?? [],
        whoIsDoingWhat: handover.who_is_doing_what ?? [],
        suggestedNextActions: handover.suggested_next_actions ?? []
      })),
      loadCategories: seed.loadCategories
    };

    return NextResponse.json({ data, mockMode: false });
  } catch {
    return NextResponse.json({ data: createSeedData(), mockMode: true });
  }
}
