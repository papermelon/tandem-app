import type { CaptureSourceType, ExtractionResult } from "../types";
import type { TelegramMessage } from "./bot";

export type TelegramCommand = {
  command: string;
  argument?: string;
};

export type TelegramMessageInput =
  | {
      kind: "photo";
      fileId: string;
      fileName: string;
      mimeType: string;
      sourceType: CaptureSourceType;
      rawText?: string;
    }
  | {
      kind: "document";
      fileId: string;
      fileName: string;
      mimeType: string;
      sourceType: CaptureSourceType;
      rawText?: string;
    }
  | {
      kind: "text";
      text: string;
      rawText: string;
      sourceType: CaptureSourceType;
    }
  | {
      kind: "unsupported";
      replyText: string;
    };

export function isAllowedTelegramUser(userId?: number, rawAllowedUserIds = process.env.TELEGRAM_ALLOWED_USER_IDS) {
  const allowed = rawAllowedUserIds
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!allowed || allowed.length === 0) return true;
  return userId ? allowed.includes(String(userId)) : false;
}

export function verifyTelegramSecretHeader(
  secretHeader: string | null,
  expected = process.env.TELEGRAM_WEBHOOK_SECRET
) {
  if (!expected) return true;
  return secretHeader === expected;
}

export function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function bestPhoto(message: TelegramMessage) {
  return message.photo?.slice().sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0))[0];
}

export function getMessageText(message: TelegramMessage) {
  return message.text || message.caption || "";
}

export function parseTelegramCommand(text?: string): TelegramCommand | null {
  const match = text?.trim().match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s+(.+))?$/);
  if (!match) return null;
  return {
    command: match[1].toLowerCase(),
    argument: match[2]?.trim()
  };
}

export function getTelegramMessageInput(message: TelegramMessage): TelegramMessageInput {
  const photo = bestPhoto(message);
  if (photo) {
    return {
      kind: "photo",
      fileId: photo.file_id,
      fileName: `telegram-photo-${message.message_id}.jpg`,
      mimeType: "image/jpeg",
      sourceType: "image",
      rawText: message.caption
    };
  }

  const document = message.document;
  if (document) {
    const mimeType = document.mime_type || "application/octet-stream";
    if (!mimeType.startsWith("image/") && mimeType !== "application/pdf") {
      return {
        kind: "unsupported",
        replyText: "I can currently process forwarded images and PDFs. This file type is not supported yet."
      };
    }

    return {
      kind: "document",
      fileId: document.file_id,
      fileName: document.file_name || `telegram-document-${message.message_id}`,
      mimeType,
      sourceType: mimeType.startsWith("image/") ? "image" : "document",
      rawText: message.caption
    };
  }

  if (message.text) {
    return {
      kind: "text",
      text: message.text,
      rawText: message.text,
      sourceType: "text"
    };
  }

  return {
    kind: "unsupported",
    replyText: "I can process forwarded text, images, and PDFs first. Voice notes are next."
  };
}

export function previewCounts(result: ExtractionResult) {
  const appointments = result.recommended_tasks.filter((task) => task.category === "appointment").length;
  return {
    documentType: result.document_type,
    appointments,
    tasks: Math.max(result.recommended_tasks.length - appointments, 0),
    medicationItems: result.medications_or_care_items.length,
    summaryText: result.plain_english_summary
  };
}
