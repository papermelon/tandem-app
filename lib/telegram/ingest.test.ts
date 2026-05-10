import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  bestPhoto,
  getMessageText,
  getTelegramMessageInput,
  isAllowedTelegramUser,
  parseTelegramCommand,
  previewCounts,
  safeFileName,
  verifyTelegramSecretHeader
} from "./ingest.ts";
import type { ExtractionResult } from "../types.ts";

test("allowed user list is optional and trims comma-separated ids", () => {
  assert.equal(isAllowedTelegramUser(123, undefined), true);
  assert.equal(isAllowedTelegramUser(123, ""), true);
  assert.equal(isAllowedTelegramUser(123, "456, 123"), true);
  assert.equal(isAllowedTelegramUser(999, "456, 123"), false);
  assert.equal(isAllowedTelegramUser(undefined, "456, 123"), false);
});

test("telegram secret is optional but enforced when configured", () => {
  assert.equal(verifyTelegramSecretHeader(null, undefined), true);
  assert.equal(verifyTelegramSecretHeader("secret", "secret"), true);
  assert.equal(verifyTelegramSecretHeader("wrong", "secret"), false);
  assert.equal(verifyTelegramSecretHeader(null, "secret"), false);
});

test("safe file names keep storage paths predictable", () => {
  assert.equal(safeFileName("mum note (final).pdf"), "mum-note--final-.pdf");
  assert.equal(safeFileName("scan_01.JPG"), "scan_01.JPG");
});

test("best photo chooses the largest Telegram photo variant", () => {
  const photo = bestPhoto({
    message_id: 10,
    chat: { id: 1 },
    photo: [
      { file_id: "small", file_size: 10, width: 90, height: 90 },
      { file_id: "large", file_size: 100, width: 900, height: 900 },
      { file_id: "medium", file_size: 50, width: 400, height: 400 }
    ]
  });

  assert.equal(photo?.file_id, "large");
});

test("message text prefers text and falls back to media captions", () => {
  assert.equal(getMessageText({ message_id: 1, chat: { id: 1 }, text: "hello", caption: "caption" }), "hello");
  assert.equal(getMessageText({ message_id: 1, chat: { id: 1 }, caption: "caption" }), "caption");
  assert.equal(getMessageText({ message_id: 1, chat: { id: 1 } }), "");
});

test("telegram command parser handles bot mentions and arguments", () => {
  assert.deepEqual(parseTelegramCommand("/start abc123"), { command: "start", argument: "abc123" });
  assert.deepEqual(parseTelegramCommand("/status@TandemCareBot"), { command: "status", argument: undefined });
  assert.equal(parseTelegramCommand("Book rehab transport"), null);
});

test("telegram input parser supports photos, PDFs, image documents, and text", () => {
  assert.deepEqual(
    getTelegramMessageInput({
      message_id: 11,
      chat: { id: 1 },
      caption: "medication label",
      photo: [{ file_id: "photo-file", file_size: 10, width: 100, height: 100 }]
    }),
    {
      kind: "photo",
      fileId: "photo-file",
      fileName: "telegram-photo-11.jpg",
      mimeType: "image/jpeg",
      sourceType: "image",
      rawText: "medication label"
    }
  );

  assert.deepEqual(
    getTelegramMessageInput({
      message_id: 12,
      chat: { id: 1 },
      caption: "discharge memo",
      document: { file_id: "pdf-file", file_name: "memo.pdf", mime_type: "application/pdf" }
    }),
    {
      kind: "document",
      fileId: "pdf-file",
      fileName: "memo.pdf",
      mimeType: "application/pdf",
      sourceType: "document",
      rawText: "discharge memo"
    }
  );

  assert.deepEqual(
    getTelegramMessageInput({
      message_id: 13,
      chat: { id: 1 },
      document: { file_id: "image-file", file_name: "scan.png", mime_type: "image/png" }
    }),
    {
      kind: "document",
      fileId: "image-file",
      fileName: "scan.png",
      mimeType: "image/png",
      sourceType: "image",
      rawText: undefined
    }
  );

  assert.deepEqual(getTelegramMessageInput({ message_id: 14, chat: { id: 1 }, text: "Book rehab transport" }), {
    kind: "text",
    text: "Book rehab transport",
    rawText: "Book rehab transport",
    sourceType: "text"
  });
});

test("telegram input parser rejects unsupported documents and empty messages", () => {
  const unsupportedDocument = getTelegramMessageInput({
    message_id: 20,
    chat: { id: 1 },
    document: { file_id: "zip-file", file_name: "archive.zip", mime_type: "application/zip" }
  });
  assert.equal(unsupportedDocument.kind, "unsupported");
  assert.match(unsupportedDocument.replyText, /images and PDFs/);

  const empty = getTelegramMessageInput({ message_id: 21, chat: { id: 1 } });
  assert.equal(empty.kind, "unsupported");
  assert.match(empty.replyText, /Voice notes are next/);
});

test("preview counts split appointments from other recommended tasks", () => {
  const result: ExtractionResult = {
    document_type: "Doctor memo",
    plain_english_summary: "Mum needs review and transport.",
    family_update_message: "Please help with the follow-ups.",
    important_dates: [],
    people_or_institutions: [],
    medications_or_care_items: ["Amlodipine"],
    recommended_tasks: [
      {
        title: "Attend cardiology review",
        priority: "high",
        category: "appointment",
        due_date: "2026-05-12"
      },
      {
        title: "Book transport",
        priority: "medium",
        category: "transport",
        due_date: "2026-05-11"
      }
    ]
  };

  assert.deepEqual(previewCounts(result), {
    documentType: "Doctor memo",
    appointments: 1,
    tasks: 1,
    medicationItems: 1,
    summaryText: "Mum needs review and transport."
  });
});
