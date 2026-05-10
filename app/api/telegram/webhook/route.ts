import { NextResponse } from "next/server";

import { extractCareDocument, extractCareText } from "@/lib/ai/extract-care-document";
import {
  approveCapture,
  createCaptureFromExtraction,
  ignoreCapture,
  senderNameFromTelegramUser
} from "@/lib/captures";
import { getErrorMessage } from "@/lib/error-message";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  answerCallbackQuery,
  captureReplyMarkup,
  downloadTelegramFile,
  extractionPreviewText,
  getTelegramFile,
  sendTelegramMessage,
  type TelegramMessage,
  type TelegramUpdate
} from "@/lib/telegram/bot";
import {
  getMessageText,
  getTelegramMessageInput,
  isAllowedTelegramUser,
  parseTelegramCommand,
  previewCounts,
  safeFileName,
  verifyTelegramSecretHeader
} from "@/lib/telegram/ingest";
import {
  getTelegramLink,
  linkTelegramUserFromToken,
  unlinkTelegramUser
} from "@/lib/telegram/linking";
import type { CaptureSourceType } from "@/lib/types";

export const runtime = "nodejs";

function jsonOk() {
  return NextResponse.json({ ok: true });
}

function verifyTelegramSecret(request: Request) {
  return verifyTelegramSecretHeader(request.headers.get("x-telegram-bot-api-secret-token"));
}

async function uploadTelegramFile(input: {
  fileId: string;
  fileName: string;
  mimeType: string;
  sourceType: CaptureSourceType;
}) {
  const telegramFile = await getTelegramFile(input.fileId);
  if (!telegramFile.file_path) throw new Error("Telegram did not return a file path.");
  const buffer = await downloadTelegramFile(telegramFile.file_path);

  const supabase = createSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server environment is not configured.");

  const storagePath = `telegram/${Date.now()}-${safeFileName(input.fileName)}`;
  const { error } = await supabase.storage.from("documents").upload(storagePath, buffer, {
    contentType: input.mimeType,
    upsert: true
  });
  if (error) throw error;

  return { buffer, storagePath };
}

async function handleCallback(update: TelegramUpdate) {
  const callback = update.callback_query;
  if (!callback?.data) return jsonOk();

  if (!isAllowedTelegramUser(callback.from.id)) {
    await answerCallbackQuery(callback.id, "This Tandem bot is private.");
    return jsonOk();
  }

  const [action, captureId] = callback.data.split(":");
  if (!captureId) return jsonOk();

  if (action === "save") {
    await approveCapture(captureId);
    await answerCallbackQuery(callback.id, "Saved to Tandem.");
    if (callback.message) {
      await sendTelegramMessage({
        chatId: callback.message.chat.id,
        text: "Saved to Tandem. The dashboard timeline and tasks are updated."
      });
    }
  }

  if (action === "ignore") {
    await ignoreCapture(captureId);
    await answerCallbackQuery(callback.id, "Ignored.");
    if (callback.message) {
      await sendTelegramMessage({ chatId: callback.message.chat.id, text: "Ignored. Nothing was saved to Tandem." });
    }
  }

  return jsonOk();
}

async function handleMessage(message: TelegramMessage) {
  const command = parseTelegramCommand(message.text);
  if (command) return await handleCommand(message, command);

  if (message.chat.type && message.chat.type !== "private") {
    await sendTelegramMessage({
      chatId: message.chat.id,
      text: "Please forward care notes to Tandem in a private chat with this bot."
    });
    return jsonOk();
  }

  if (!isAllowedTelegramUser(message.from?.id)) {
    await sendTelegramMessage({ chatId: message.chat.id, text: "This Tandem bot is private." });
    return jsonOk();
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server environment is not configured.");

  const link = await getTelegramLink(supabase, message.from);
  if (!link) {
    await sendTelegramMessage({
      chatId: message.chat.id,
      text: "Please connect Telegram from Tandem settings first. This keeps forwarded care notes attached to the right care recipient."
    });
    return jsonOk();
  }

  await sendTelegramMessage({ chatId: message.chat.id, text: "Got it. I’m reading this care item for Tandem." });

  const senderName = senderNameFromTelegramUser(message.from);
  const platformSenderId = message.from?.id ? String(message.from.id) : undefined;
  const platformMessageId = String(message.message_id);
  const context = `Forwarded by ${senderName} through Telegram. ${getMessageText(message)}`;
  const input = getTelegramMessageInput(message);

  let captureId: string;

  if (input.kind === "photo" || input.kind === "document") {
    const uploaded = await uploadTelegramFile({
      fileId: input.fileId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sourceType: input.sourceType
    });
    const extraction = await extractCareDocument({
      buffer: uploaded.buffer,
      fileName: input.fileName,
      mimeType: input.mimeType,
      context
    });
    captureId = await createCaptureFromExtraction({
      platform: "telegram",
      sourceType: input.sourceType,
      result: extraction.result,
      senderName,
      platformSenderId,
      platformMessageId,
      originalFilePath: uploaded.storagePath,
      originalFileName: input.fileName,
      originalFileMimeType: input.mimeType,
      rawText: input.rawText,
      careCircleId: link.careCircleId
    });

    await sendTelegramMessage({
      chatId: message.chat.id,
      text: extractionPreviewText(previewCounts(extraction.result)),
      replyMarkup: captureReplyMarkup(captureId)
    });
    return jsonOk();
  }

  if (input.kind === "text") {
    const extraction = await extractCareText({ text: input.text, context });
    captureId = await createCaptureFromExtraction({
      platform: "telegram",
      sourceType: input.sourceType,
      result: extraction.result,
      senderName,
      platformSenderId,
      platformMessageId,
      rawText: input.rawText,
      careCircleId: link.careCircleId
    });

    await sendTelegramMessage({
      chatId: message.chat.id,
      text: extractionPreviewText(previewCounts(extraction.result)),
      replyMarkup: captureReplyMarkup(captureId)
    });
    return jsonOk();
  }

  await sendTelegramMessage({
    chatId: message.chat.id,
    text: input.replyText
  });
  return jsonOk();
}

async function handleCommand(message: TelegramMessage, command: { command: string; argument?: string }) {
  if (message.chat.type && message.chat.type !== "private") {
    await sendTelegramMessage({
      chatId: message.chat.id,
      text: "Please connect Tandem in a private chat with this bot."
    });
    return jsonOk();
  }

  if (!isAllowedTelegramUser(message.from?.id)) {
    await sendTelegramMessage({ chatId: message.chat.id, text: "This Tandem bot is private." });
    return jsonOk();
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server environment is not configured.");

  if (command.command === "start") {
    if (command.argument) {
      const result = await linkTelegramUserFromToken(supabase, message, command.argument);
      await sendTelegramMessage({ chatId: message.chat.id, text: result.text });
      return jsonOk();
    }

    const link = await getTelegramLink(supabase, message.from);
    await sendTelegramMessage({
      chatId: message.chat.id,
      text: link?.recipientName
        ? `Telegram is connected to ${link.recipientName}'s Tandem care space.`
        : "Open Tandem settings and use Connect Telegram to link this bot."
    });
    return jsonOk();
  }

  if (command.command === "status" || command.command === "recipient") {
    const link = await getTelegramLink(supabase, message.from);
    await sendTelegramMessage({
      chatId: message.chat.id,
      text: link
        ? `Connected to ${link.recipientName ?? "your Tandem care recipient"}. Forward text, images, or PDFs here.`
        : "Telegram is not connected yet. Open Tandem settings and use Connect Telegram."
    });
    return jsonOk();
  }

  if (command.command === "unlink") {
    const ok = await unlinkTelegramUser(supabase, message.from);
    await sendTelegramMessage({
      chatId: message.chat.id,
      text: ok ? "Telegram has been disconnected from Tandem." : "Telegram was not connected to Tandem."
    });
    return jsonOk();
  }

  await sendTelegramMessage({
    chatId: message.chat.id,
    text: "I understand /start, /status, /recipient, and /unlink. Forward care notes, images, or PDFs after connecting Tandem."
  });
  return jsonOk();
}

export async function POST(request: Request) {
  if (!verifyTelegramSecret(request)) {
    return NextResponse.json({ error: "Invalid Telegram webhook secret." }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;

  try {
    if (update.callback_query) return await handleCallback(update);
    if (update.message) return await handleMessage(update.message);
    return jsonOk();
  } catch (error) {
    console.error("Telegram webhook failed", error);
    const chatId = update.message?.chat.id || update.callback_query?.message?.chat.id;
    if (chatId) {
      await sendTelegramMessage({
        chatId,
        text: "I could not process that item yet. Please check Tandem configuration and try again."
    }).catch(() => undefined);
    }
    return NextResponse.json({ ok: false, error: getErrorMessage(error, "Telegram webhook failed.") });
  }
}
