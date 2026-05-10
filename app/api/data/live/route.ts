import { NextResponse } from "next/server";

import { createSeedData } from "@/lib/seed-data";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { AppData, CareProfile } from "@/lib/types";

export const runtime = "nodejs";

function hasCareProfile(profile: unknown): profile is CareProfile {
  return (
    typeof profile === "object" &&
    profile !== null &&
    Array.isArray((profile as CareProfile).sections) &&
    (profile as CareProfile).sections.length > 0
  );
}

async function getSignedInProfile(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return { error: NextResponse.json({ error: "Supabase is not configured" }, { status: 503 }) };
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { error: NextResponse.json({ error: "Missing bearer token" }, { status: 401 }) };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const existing = await supabase
    .from("users")
    .select("id, name, role, avatar, phone, is_default_caregiver")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (existing.error) {
    return { error: NextResponse.json({ error: existing.error.message }, { status: 500 }) };
  }

  if (!existing.data) {
    return { error: NextResponse.json({ error: "Profile is not ready yet" }, { status: 404 }) };
  }

  return { supabase, profile: existing.data };
}

async function loadCircleData(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  userId: string
) {
  const membershipsResult = await supabase
    .from("circle_members")
    .select("care_circle_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (membershipsResult.error) {
    throw new Error(membershipsResult.error.message);
  }

  const careCircleId = membershipsResult.data?.[0]?.care_circle_id;
  if (!careCircleId) {
    return { needsOnboarding: true as const, data: null };
  }

  const [
    membersResult,
    recipientResult,
    timelineResult,
    tasksResult,
    documentsResult,
    signalsResult,
    handoversResult
  ] = await Promise.all([
    supabase
      .from("circle_members")
      .select("users:user_id(id, name, role, avatar, phone, is_default_caregiver, category_preferences, load_capacity_pct)")
      .eq("care_circle_id", careCircleId),
    supabase.from("care_recipients").select("*").eq("care_circle_id", careCircleId).limit(1).maybeSingle(),
    supabase.from("timeline_items").select("*").eq("care_circle_id", careCircleId).order("timestamp", { ascending: false }),
    supabase.from("tasks").select("*").eq("care_circle_id", careCircleId).order("due_date", { ascending: true }),
    supabase.from("documents").select("*").eq("care_circle_id", careCircleId).order("uploaded_at", { ascending: false }),
    supabase.from("care_signals").select("*").eq("care_circle_id", careCircleId).order("timestamp", { ascending: false }),
    supabase.from("handovers").select("*").eq("care_circle_id", careCircleId).order("created_at", { ascending: false })
  ]);

  if (
    membersResult.error ||
    recipientResult.error ||
    timelineResult.error ||
    tasksResult.error ||
    documentsResult.error ||
    signalsResult.error ||
    handoversResult.error
  ) {
    throw new Error(
      membersResult.error?.message ||
        recipientResult.error?.message ||
        timelineResult.error?.message ||
        tasksResult.error?.message ||
        documentsResult.error?.message ||
        signalsResult.error?.message ||
        handoversResult.error?.message ||
        "Supabase query failed"
    );
  }

  if (!recipientResult.data) {
    return { needsOnboarding: true as const, data: null };
  }

  const seed = createSeedData();
  const recipientCareProfile = recipientResult.data.care_profile;
  const data: AppData = {
    members: (membersResult.data ?? []).flatMap((row) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users;
      if (!user) return [];
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        isDefaultCaregiver: user.is_default_caregiver,
        categoryPreferences: user.category_preferences ?? [],
        loadCapacityPct: user.load_capacity_pct ?? 100
      };
    }),
    recipient: {
      id: recipientResult.data.id,
      name: recipientResult.data.name,
      age: recipientResult.data.age,
      context: recipientResult.data.context,
      address: recipientResult.data.address,
      careCircleId: recipientResult.data.care_circle_id,
      relationship: recipientResult.data.relationship ?? undefined,
      country: recipientResult.data.country ?? undefined,
      phone: recipientResult.data.phone ?? undefined,
      careProfile: hasCareProfile(recipientCareProfile) ? recipientCareProfile : seed.recipient.careProfile
    },
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
    handoverSessions: seed.handoverSessions,
    loadCategories: seed.loadCategories
  };

  return { needsOnboarding: false as const, data };
}

export async function GET(request: Request) {
  const session = await getSignedInProfile(request);
  if ("error" in session) return session.error;

  try {
    const result = await loadCircleData(session.supabase, session.profile.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load live care data" },
      { status: 500 }
    );
  }
}
