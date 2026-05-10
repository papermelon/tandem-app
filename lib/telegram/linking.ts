import type { SupabaseClient } from "@supabase/supabase-js";

import { senderNameFromTelegramUser } from "@/lib/captures";
import type { TelegramMessage, TelegramUser } from "@/lib/telegram/bot";

export type TelegramLink = {
  telegramUserId: string;
  telegramChatId?: string;
  userId: string;
  careCircleId: string;
  careRecipientId?: string;
  recipientName?: string;
};

type TelegramUserRow = {
  telegram_user_id: string;
  telegram_chat_id?: string | null;
  user_id?: string | null;
  default_care_circle_id?: string | null;
  default_care_recipient_id?: string | null;
};

type LinkTokenRow = {
  token: string;
  user_id: string;
  care_circle_id: string;
  care_recipient_id?: string | null;
  expires_at: string;
  used_at?: string | null;
};

function telegramUserId(user?: Pick<TelegramUser, "id">) {
  return user?.id ? String(user.id) : undefined;
}

export async function getTelegramLink(
  supabase: SupabaseClient,
  user?: Pick<TelegramUser, "id">
): Promise<TelegramLink | null> {
  const id = telegramUserId(user);
  if (!id) return null;

  const { data, error } = await supabase
    .from("telegram_users")
    .select("telegram_user_id, telegram_chat_id, user_id, default_care_circle_id, default_care_recipient_id")
    .eq("telegram_user_id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as TelegramUserRow;
  if (!row.user_id || !row.default_care_circle_id) return null;

  const membership = await supabase
    .from("circle_members")
    .select("id")
    .eq("user_id", row.user_id)
    .eq("care_circle_id", row.default_care_circle_id)
    .maybeSingle();

  if (membership.error || !membership.data) return null;

  let recipientName: string | undefined;
  if (row.default_care_recipient_id) {
    const recipient = await supabase
      .from("care_recipients")
      .select("name")
      .eq("id", row.default_care_recipient_id)
      .maybeSingle();
    recipientName = (recipient.data as { name?: string } | null)?.name;
  }

  return {
    telegramUserId: row.telegram_user_id,
    telegramChatId: row.telegram_chat_id ?? undefined,
    userId: row.user_id,
    careCircleId: row.default_care_circle_id,
    careRecipientId: row.default_care_recipient_id ?? undefined,
    recipientName
  };
}

export async function linkTelegramUserFromToken(
  supabase: SupabaseClient,
  message: TelegramMessage,
  token: string
) {
  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false as const, text: "Open Tandem settings and use Connect Telegram to link this bot." };
  }

  const { data, error } = await supabase
    .from("telegram_link_tokens")
    .select("token, user_id, care_circle_id, care_recipient_id, expires_at, used_at")
    .eq("token", trimmed)
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, text: "That Telegram link is not valid. Please create a new one in Tandem." };
  }

  const row = data as LinkTokenRow;
  if (row.used_at) {
    return { ok: false as const, text: "That Telegram link has already been used. Please create a new one in Tandem." };
  }

  if (Date.parse(row.expires_at) <= Date.now()) {
    return { ok: false as const, text: "That Telegram link has expired. Please create a new one in Tandem." };
  }

  const membership = await supabase
    .from("circle_members")
    .select("id")
    .eq("user_id", row.user_id)
    .eq("care_circle_id", row.care_circle_id)
    .maybeSingle();

  if (membership.error || !membership.data) {
    return { ok: false as const, text: "This Tandem account is not a member of that care circle." };
  }

  const telegramId = telegramUserId(message.from);
  if (!telegramId) {
    return { ok: false as const, text: "Telegram did not include a sender ID. Please try again from a private chat." };
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await supabase.from("telegram_users").upsert(
    {
      telegram_user_id: telegramId,
      telegram_chat_id: String(message.chat.id),
      user_id: row.user_id,
      display_name: senderNameFromTelegramUser(message.from),
      username: message.from?.username,
      default_care_circle_id: row.care_circle_id,
      default_care_recipient_id: row.care_recipient_id,
      linked_at: now,
      updated_at: now
    },
    { onConflict: "telegram_user_id" }
  );

  if (upsertError) {
    return { ok: false as const, text: "Tandem could not link Telegram yet. Please try again." };
  }

  await supabase.from("telegram_link_tokens").update({ used_at: now }).eq("token", trimmed);

  let recipientName: string | undefined;
  if (row.care_recipient_id) {
    const recipient = await supabase
      .from("care_recipients")
      .select("name")
      .eq("id", row.care_recipient_id)
      .maybeSingle();
    recipientName = (recipient.data as { name?: string } | null)?.name;
  }

  return {
    ok: true as const,
    text: recipientName
      ? `Telegram is connected to ${recipientName}'s Tandem care space. Forward care notes, images, or PDFs here.`
      : "Telegram is connected to Tandem. Forward care notes, images, or PDFs here."
  };
}

export async function unlinkTelegramUser(supabase: SupabaseClient, user?: Pick<TelegramUser, "id">) {
  const id = telegramUserId(user);
  if (!id) return false;

  const { error } = await supabase.from("telegram_users").delete().eq("telegram_user_id", id);
  return !error;
}
