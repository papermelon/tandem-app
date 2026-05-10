import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createSeedData } from "@/lib/seed-data";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { AppData, CareProfile } from "@/lib/types";

export const runtime = "nodejs";

type RecipientDraft = {
  name?: string;
  age?: number;
  relationship?: string;
  country?: string;
  context?: string;
  address?: string;
};

function hasCareProfile(profile: unknown): profile is CareProfile {
  return (
    typeof profile === "object" &&
    profile !== null &&
    Array.isArray((profile as CareProfile).sections) &&
    (profile as CareProfile).sections.length > 0
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";
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

  const displayName =
    (typeof data.user.user_metadata?.name === "string" && data.user.user_metadata.name.trim()) ||
    data.user.email?.split("@")[0] ||
    "Caregiver";

  const existing = await supabase
    .from("users")
    .select("id, name, role, avatar, phone, is_default_caregiver")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (existing.error) {
    return { error: NextResponse.json({ error: existing.error.message }, { status: 500 }) };
  }

  if (existing.data) {
    return { supabase, profile: existing.data };
  }

  const inserted = await supabase
    .from("users")
    .insert({
      id: `user-${data.user.id.slice(0, 8)}`,
      auth_user_id: data.user.id,
      name: displayName,
      role: "Family caregiver",
      avatar: initials(displayName),
      is_default_caregiver: true
    })
    .select("id, name, role, avatar, phone, is_default_caregiver")
    .single();

  if (inserted.error) {
    return { error: NextResponse.json({ error: inserted.error.message }, { status: 500 }) };
  }

  return { supabase, profile: inserted.data };
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
      .select("users:user_id(id, name, role, avatar, phone, is_default_caregiver)")
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
        categoryPreferences: [],
        loadCapacityPct: 100
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
      careProfile: hasCareProfile(recipientCareProfile) ? recipientCareProfile : undefined
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

export async function POST(request: Request) {
  const session = await getSignedInProfile(request);
  if ("error" in session) return session.error;

  const body = (await request.json().catch(() => ({}))) as { recipient?: RecipientDraft };
  const draft = body.recipient ?? {};
  const name = draft.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Care recipient name is required" }, { status: 400 });
  }

  const careCircleId = `circle-${randomUUID().slice(0, 8)}`;
  const recipientId = `recipient-${randomUUID().slice(0, 8)}`;
  const relationship = draft.relationship?.trim() || "Family member";
  const country = draft.country?.trim() || "Singapore";

  const circleResult = await session.supabase
    .from("care_circles")
    .insert({
      id: careCircleId,
      name: `${name}'s care circle`,
      created_by: session.profile.id
    });

  if (circleResult.error) {
    return NextResponse.json({ error: circleResult.error.message }, { status: 500 });
  }

  const memberResult = await session.supabase.from("circle_members").insert({
    care_circle_id: careCircleId,
    user_id: session.profile.id,
    member_role: "lead caregiver"
  });

  if (memberResult.error) {
    return NextResponse.json({ error: memberResult.error.message }, { status: 500 });
  }

  const recipientResult = await session.supabase.from("care_recipients").insert({
    id: recipientId,
    care_circle_id: careCircleId,
    name,
    age: Number.isFinite(draft.age) ? draft.age : 0,
    relationship,
    country,
    context: draft.context?.trim() || `${relationship} in ${country}. Add care notes as you learn them.`,
    address: draft.address?.trim() || country,
    care_profile: {
      summary: "New care profile. Add food, mobility, medication, and safety notes during setup.",
      updatedAt: new Date().toISOString().slice(0, 10),
      sections: []
    }
  });

  if (recipientResult.error) {
    return NextResponse.json({ error: recipientResult.error.message }, { status: 500 });
  }

  try {
    const result = await loadCircleData(session.supabase, session.profile.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Created circle but could not reload live care data" },
      { status: 500 }
    );
  }
}
