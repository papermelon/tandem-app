import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type LinkRequestBody = {
  careRecipientId?: string;
};

async function botUsername() {
  const configured = process.env.TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";
  if (configured) return configured;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return "";

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: "no-store" });
    const payload = (await response.json()) as { ok?: boolean; result?: { username?: string } };
    return payload.ok ? payload.result?.username ?? "" : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const profileResult = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }

  if (!profileResult.data?.id) {
    return NextResponse.json({ error: "Create your Tandem profile before connecting Telegram." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as LinkRequestBody;
  const userId = profileResult.data.id as string;
  let careCircleId: string | undefined;
  let careRecipientId: string | undefined;
  let recipientName: string | undefined;

  if (body.careRecipientId) {
    const recipientResult = await supabase
      .from("care_recipients")
      .select("id, name, care_circle_id")
      .eq("id", body.careRecipientId)
      .maybeSingle();

    if (recipientResult.error) {
      return NextResponse.json({ error: recipientResult.error.message }, { status: 500 });
    }

    if (!recipientResult.data) {
      return NextResponse.json({ error: "Care recipient not found." }, { status: 404 });
    }

    careCircleId = recipientResult.data.care_circle_id as string;
    careRecipientId = recipientResult.data.id as string;
    recipientName = recipientResult.data.name as string;
  } else {
    const membershipResult = await supabase
      .from("circle_members")
      .select("care_circle_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipResult.error) {
      return NextResponse.json({ error: membershipResult.error.message }, { status: 500 });
    }

    careCircleId = membershipResult.data?.care_circle_id as string | undefined;
  }

  if (!careCircleId) {
    return NextResponse.json({ error: "Create or join a care space before connecting Telegram." }, { status: 400 });
  }

  const membershipCheck = await supabase
    .from("circle_members")
    .select("id")
    .eq("user_id", userId)
    .eq("care_circle_id", careCircleId)
    .maybeSingle();

  if (membershipCheck.error) {
    return NextResponse.json({ error: membershipCheck.error.message }, { status: 500 });
  }

  if (!membershipCheck.data) {
    return NextResponse.json({ error: "You are not a member of that care space." }, { status: 403 });
  }

  if (!careRecipientId) {
    const recipientResult = await supabase
      .from("care_recipients")
      .select("id, name")
      .eq("care_circle_id", careCircleId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (recipientResult.error) {
      return NextResponse.json({ error: recipientResult.error.message }, { status: 500 });
    }

    careRecipientId = recipientResult.data?.id as string | undefined;
    recipientName = recipientResult.data?.name as string | undefined;
  }

  const linkToken = randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const insertResult = await supabase.from("telegram_link_tokens").insert({
    token: linkToken,
    user_id: userId,
    care_circle_id: careCircleId,
    care_recipient_id: careRecipientId,
    expires_at: expiresAt
  });

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  const username = await botUsername();
  return NextResponse.json({
    token: linkToken,
    expiresAt,
    botUsername: username || null,
    botUrl: username ? `https://t.me/${username.replace(/^@/, "")}?start=${linkToken}` : null,
    startCommand: `/start ${linkToken}`,
    recipientName
  });
}
