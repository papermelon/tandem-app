import { NextResponse } from "next/server";

import { extractCareDocument, extractCareText } from "@/lib/ai/extract-care-document";
import {
  approveCapture,
  createCaptureFromExtraction,
  ignoreCapture,
  senderNameFromTelegramUser
} from "@/lib/captures";
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
import type { CaptureSourceType, ExtractionResult } from "@/lib/types";

export const runtime = "nodejs";

function jsonOk() {
  return NextResponse.json({ ok: true });
}

function isAllowedTelegramUser(userId?: number) {
  const allowed = process.env.TELEGRAM_ALLOWED_USER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!allowed || allowed.length === 0) return true;
  return userId ? allowed.includes(String(userId)) : false;
}

function verifyTelegramSecret(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true;
  return request.headers.get("x-telegram-bot-api-secret-token") === expected;
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function bestPhoto(message: TelegramMessage) {
  return message.photo?.slice().sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0))[0];
}

function getMessageText(message: TelegramMessage) {
  return message.text || message.caption || "";
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

function previewCounts(result: ExtractionResult) {
  const appointments = result.recommended_tasks.filter((task) => task.category === "appointment").length;
  return {
    documentType: result.document_type,
    appointments,
    tasks: Math.max(result.recommended_tasks.length - appointments, 0),
    medicationItems: result.medications_or_care_items.length,
    summaryText: result.plain_english_summary
  };
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
  if (!isAllowedTelegramUser(message.from?.id)) {
    await sendTelegramMessage({ chatId: message.chat.id, text: "This Tandem bot is private." });
    return jsonOk();
  }

  await sendTelegramMessage({ chatId: message.chat.id, text: "Got it. I’m reading this care item for Tandem." });

  const senderName = senderNameFromTelegramUser(message.from);
  const platformSenderId = message.from?.id ? String(message.from.id) : undefined;
  const platformMessageId = String(message.message_id);
  const context = `Forwarded by ${senderName} through Telegram. ${getMessageText(message)}`;

  const photo = bestPhoto(message);
  const document = message.document;
  const text = message.text;

  let captureId: string;

  if (photo) {
    const mimeType = "image/jpeg";
    const fileName = `telegram-photo-${message.message_id}.jpg`;
    const uploaded = await uploadTelegramFile({ fileId: photo.file_id, fileName, mimeType, sourceType: "image" });
    const extraction = await extractCareDocument({ buffer: uploaded.buffer, fileName, mimeType, context });
    captureId = await createCaptureFromExtraction({
      platform: "telegram",
      sourceType: "image",
      result: extraction.result,
      senderName,
      platformSenderId,
      platformMessageId,
      originalFilePath: uploaded.storagePath,
      originalFileName: fileName,
      originalFileMimeType: mimeType,
      rawText: message.caption
    });

    await sendTelegramMessage({
      chatId: message.chat.id,
      text: extractionPreviewText(previewCounts(extraction.result)),
      replyMarkup: captureReplyMarkup(captureId)
    });
    return jsonOk();
  }

  if (document) {
    const mimeType = document.mime_type || "application/octet-stream";
    const fileName = document.file_name || `telegram-document-${message.message_id}`;
    if (!mimeType.startsWith("image/") && mimeType !== "application/pdf") {
      await sendTelegramMessage({
        chatId: message.chat.id,
        text: "I can currently process forwarded images and PDFs. This file type is not supported yet."
      });
      return jsonOk();
    }

    const uploaded = await uploadTelegramFile({
      fileId: document.file_id,
      fileName,
      mimeType,
      sourceType: mimeType.startsWith("image/") ? "image" : "document"
    });
    const extraction = await extractCareDocument({ buffer: uploaded.buffer, fileName, mimeType, context });
    captureId = await createCaptureFromExtraction({
      platform: "telegram",
      sourceType: mimeType.startsWith("image/") ? "image" : "document",
      result: extraction.result,
      senderName,
      platformSenderId,
      platformMessageId,
      originalFilePath: uploaded.storagePath,
      originalFileName: fileName,
      originalFileMimeType: mimeType,
      rawText: message.caption
    });

    await sendTelegramMessage({
      chatId: message.chat.id,
      text: extractionPreviewText(previewCounts(extraction.result)),
      replyMarkup: captureReplyMarkup(captureId)
    });
    return jsonOk();
  }

  if (text) {
    const extraction = await extractCareText({ text, context });
    captureId = await createCaptureFromExtraction({
      platform: "telegram",
      sourceType: "text",
      result: extraction.result,
      senderName,
      platformSenderId,
      platformMessageId,
      rawText: text
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
    text: "I can process forwarded text, images, and PDFs first. Voice notes are next."
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
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Telegram webhook failed." });
  }
}
