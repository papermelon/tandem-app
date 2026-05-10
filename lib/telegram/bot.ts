type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type?: string };
  text?: string;
  caption?: string;
  photo?: Array<{ file_id: string; file_size?: number; width: number; height: number }>;
  document?: { file_id: string; file_name?: string; mime_type?: string };
  voice?: { file_id: string; mime_type?: string; duration?: number };
  audio?: { file_id: string; file_name?: string; mime_type?: string };
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type TelegramFile = {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
};

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  return token;
}

async function telegramRequest<T>(method: string, body?: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : "{}"
  });
  const payload = (await response.json()) as TelegramApiResponse<T>;
  if (!payload.ok) {
    throw new Error(payload.description || `Telegram ${method} failed.`);
  }
  return payload.result as T;
}

export async function sendTelegramMessage(input: {
  chatId: number;
  text: string;
  replyMarkup?: Record<string, unknown>;
}) {
  return telegramRequest<TelegramMessage>("sendMessage", {
    chat_id: input.chatId,
    text: input.text,
    reply_markup: input.replyMarkup
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramRequest<boolean>("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text
  });
}

export async function getTelegramFile(fileId: string) {
  return telegramRequest<TelegramFile>("getFile", { file_id: fileId });
}

export async function downloadTelegramFile(filePath: string) {
  const response = await fetch(`https://api.telegram.org/file/bot${botToken()}/${filePath}`);
  if (!response.ok) {
    throw new Error("Could not download Telegram file.");
  }
  return Buffer.from(await response.arrayBuffer());
}

export function captureReplyMarkup(captureId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return {
    inline_keyboard: [
      [
        { text: "Save All", callback_data: `save:${captureId}` },
        { text: "Ignore", callback_data: `ignore:${captureId}` }
      ],
      ...(appUrl ? [[{ text: "Review in Dashboard", url: `${appUrl}/inbox?capture=${captureId}` }]] : [])
    ]
  };
}

export function extractionPreviewText(summary: {
  documentType: string;
  appointments: number;
  tasks: number;
  medicationItems: number;
  summaryText: string;
}) {
  const lines = [
    "I found care details in the forwarded item:",
    "",
    `- ${summary.appointments} appointment${summary.appointments === 1 ? "" : "s"}`,
    `- ${summary.tasks} task${summary.tasks === 1 ? "" : "s"}`,
    `- ${summary.medicationItems} medication/care item${summary.medicationItems === 1 ? "" : "s"}`,
    "",
    summary.documentType ? `Document type: ${summary.documentType}` : undefined,
    summary.summaryText,
    "",
    "Save to Tandem?"
  ];

  return lines.filter(Boolean).join("\n");
}
