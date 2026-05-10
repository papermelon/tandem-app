import { NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ mode: "mock" });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const displayName =
    body.name?.trim() ||
    (typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name.trim() : "") ||
    data.user.email?.split("@")[0] ||
    "Caregiver";

  const existing = await supabase
    .from("users")
    .select("id, name, role, avatar, phone, is_default_caregiver")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }

  if (existing.data) {
    return NextResponse.json({
      profile: {
        id: existing.data.id,
        name: existing.data.name,
        role: existing.data.role,
        avatar: existing.data.avatar,
        phone: existing.data.phone,
        isDefaultCaregiver: existing.data.is_default_caregiver,
      },
    });
  }

  const id = `user-${data.user.id.slice(0, 8)}`;
  const avatar = displayName.slice(0, 1).toUpperCase() || "C";
  const inserted = await supabase
    .from("users")
    .insert({
      id,
      auth_user_id: data.user.id,
      name: displayName,
      role: "Family caregiver",
      avatar,
      is_default_caregiver: false,
    })
    .select("id, name, role, avatar, phone, is_default_caregiver")
    .single();

  if (inserted.error) {
    return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: {
      id: inserted.data.id,
      name: inserted.data.name,
      role: inserted.data.role,
      avatar: inserted.data.avatar,
      phone: inserted.data.phone,
      isDefaultCaregiver: inserted.data.is_default_caregiver,
    },
  });
}
