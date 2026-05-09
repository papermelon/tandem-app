import type { SupabaseClient } from "@supabase/supabase-js";

import { CARE_CIRCLE_ID } from "@/lib/captures";
import { rankAssignees, ROUTING_SCORE_FLOOR } from "@/lib/routing";
import type { FamilyMember, RoutingCandidate, Task, TaskCategory, TaskPriority } from "@/lib/types";

type ExtractedItemRow = {
  id: string;
  capture_event_id: string;
  item_type: string;
  category?: TaskCategory | null;
  due_at?: string | null;
  priority?: TaskPriority | null;
  structured_data?: Record<string, unknown> | null;
  assigned_to_id?: string | null;
};

export async function applyRoutingForCapture(
  supabase: SupabaseClient,
  captureId: string
): Promise<void> {
  const [itemsResult, usersResult, tasksResult, circleResult] = await Promise.all([
    supabase
      .from("extracted_items")
      .select("id, capture_event_id, item_type, category, due_at, priority, structured_data, assigned_to_id")
      .eq("capture_event_id", captureId),
    supabase
      .from("users")
      .select("id, name, role, avatar, phone, is_default_caregiver, category_preferences, load_capacity_pct"),
    supabase
      .from("tasks")
      .select("id, title, category, assignee_id, due_date, status, priority")
      .eq("care_circle_id", CARE_CIRCLE_ID),
    supabase
      .from("care_circles")
      .select("auto_execute_assignments")
      .eq("id", CARE_CIRCLE_ID)
      .maybeSingle()
  ]);

  if (itemsResult.error || usersResult.error || tasksResult.error) return;

  const items = (itemsResult.data ?? []) as ExtractedItemRow[];
  const taskItems = items.filter((item) => item.item_type === "task" || item.item_type === "appointment");
  if (taskItems.length === 0) return;

  const members: FamilyMember[] = (usersResult.data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    avatar: u.avatar,
    phone: u.phone ?? undefined,
    isDefaultCaregiver: Boolean(u.is_default_caregiver),
    categoryPreferences: (u.category_preferences ?? []) as TaskCategory[],
    loadCapacityPct: u.load_capacity_pct ?? 100
  }));

  const tasks: Task[] = (tasksResult.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category as TaskCategory,
    assigneeId: t.assignee_id ?? undefined,
    dueDate: t.due_date,
    status: t.status,
    priority: t.priority
  }));

  const autoExecute = Boolean(circleResult.data?.auto_execute_assignments);
  const now = new Date();

  const decisionRows: Array<Record<string, unknown>> = [];

  for (const item of taskItems) {
    const candidates = rankAssignees(
      {
        category: item.category ?? undefined,
        dueAt: item.due_at ?? undefined,
        priority: item.priority ?? undefined
      },
      { members, tasks, now }
    );

    const top = candidates[0];
    const shouldAutoExecute = autoExecute && !!top && top.score >= ROUTING_SCORE_FLOOR;
    const chosenId = shouldAutoExecute ? top!.memberId : null;

    const nextStructured = {
      ...(item.structured_data ?? {}),
      suggested_assignees: candidates as unknown as RoutingCandidate[]
    };

    const patch: Record<string, unknown> = {
      structured_data: nextStructured,
      updated_at: now.toISOString()
    };
    if (chosenId && !item.assigned_to_id) {
      patch.assigned_to_id = chosenId;
    }

    await supabase.from("extracted_items").update(patch).eq("id", item.id);

    decisionRows.push({
      care_circle_id: CARE_CIRCLE_ID,
      extracted_item_id: item.id,
      candidates,
      chosen_member_id: chosenId,
      auto_executed: shouldAutoExecute,
      decided_at: now.toISOString()
    });
  }

  if (decisionRows.length > 0) {
    await supabase.from("routing_decisions").insert(decisionRows);
  }
}

export async function recordReassignment(
  supabase: SupabaseClient,
  extractedItemId: string,
  newAssigneeId: string | null
): Promise<void> {
  const { data } = await supabase
    .from("routing_decisions")
    .select("id, chosen_member_id, decided_at, accepted, reassigned_within_4h")
    .eq("extracted_item_id", extractedItemId)
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return;

  const decidedAt = Date.parse(data.decided_at as string);
  const elapsedHours = Number.isFinite(decidedAt) ? (Date.now() - decidedAt) / 3_600_000 : Infinity;
  const accepted = newAssigneeId === data.chosen_member_id;

  await supabase
    .from("routing_decisions")
    .update({
      accepted,
      reassigned_within_4h: !accepted && elapsedHours <= 4,
      resolved_at: new Date().toISOString()
    })
    .eq("id", data.id as string);
}
