import { NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";
}

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
    return NextResponse.json({ profile: existing.data });
  }

  const inserted = await supabase
    .from("users")
    .insert({
      id: `user-${data.user.id.slice(0, 8)}`,
      auth_user_id: data.user.id,
      name: displayName,
      role: "Family caregiver",
      avatar: initials(displayName),
      is_default_caregiver: true,
    })
    .select("id, name, role, avatar, phone, is_default_caregiver")
    .single();

  if (inserted.error) {
    return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: inserted.data });
}
