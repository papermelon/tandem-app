import { NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string; name?: string };
  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name: body.name?.trim() || undefined },
    redirectTo: `${origin}/auth/callback`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `Magic link sent to ${email}.` });
}
