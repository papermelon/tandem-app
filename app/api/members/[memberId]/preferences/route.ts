import { NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { TaskCategory } from "@/lib/types";

export const runtime = "nodejs";

const ALLOWED_CATEGORIES: TaskCategory[] = [
  "appointment",
  "transport",
  "medication",
  "admin",
  "finance",
  "check-in",
  "home safety"
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const body = (await request.json()) as {
    categoryPreferences?: string[];
    loadCapacityPct?: number;
  };

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    // Mock mode — provider persists locally.
    return NextResponse.json({ ok: true, mode: "mock" });
  }

  const patch: Record<string, unknown> = {};
  if (Array.isArray(body.categoryPreferences)) {
    patch.category_preferences = body.categoryPreferences.filter((c): c is TaskCategory =>
      ALLOWED_CATEGORIES.includes(c as TaskCategory)
    );
  }
  if (typeof body.loadCapacityPct === "number" && Number.isFinite(body.loadCapacityPct)) {
    patch.load_capacity_pct = Math.max(0, Math.min(200, Math.round(body.loadCapacityPct)));
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("users").update(patch).eq("id", memberId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
