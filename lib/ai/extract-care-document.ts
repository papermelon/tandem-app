import { zodTextFormat } from "openai/helpers/zod";

import { mockExtraction } from "@/lib/ai/mock";
import { getOpenAIClient, OPENAI_MODEL, parsedOutput } from "@/lib/ai/openai";
import { extractionSchema } from "@/lib/ai/schemas";
import type { ExtractionResult } from "@/lib/types";

type ExtractCareDocumentInput = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  context?: string;
};

type ExtractCareTextInput = {
  text: string;
  context?: string;
};

type ExtractCareResult = {
  result: ExtractionResult;
  mode: "mock" | "openai";
  reason?: string;
};

const SYSTEM_PROMPT =
  "Extract caregiving coordination information from Singapore family care messages and documents. Do not diagnose, provide medical advice, or invent clinical recommendations. Medication items are reminders or document notes only. Return concise plain English and family-safe task suggestions that the user must review before saving.";

function careContext(context?: string) {
  return `Care recipient: Ah Muay, Rachel's mum, 78, mild dementia, recent fall. Family members: Rachel, Ming, Lina. Context from user: ${
    context || "Forwarded to Tandem for family care coordination."
  }`;
}

async function parseCareContent(
  content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "high" }
    | { type: "input_file"; file_id: string }
  >
) {
  const client = getOpenAIClient();
  if (!client) {
    return { result: mockExtraction(), mode: "mock" as const, reason: "missing_openai_key" };
  }

  const response = await client.responses.parse({
    model: OPENAI_MODEL,
    reasoning: { effort: "low" },
    text: {
      verbosity: "low",
      format: zodTextFormat(extractionSchema, "tandem_document_extraction")
    },
    input: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content
      }
    ]
  });

  return { result: parsedOutput<ExtractionResult>(response), mode: "openai" as const };
}

export async function extractCareText({ text, context }: ExtractCareTextInput): Promise<ExtractCareResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { result: mockExtraction(), mode: "mock", reason: "empty_text" };
  }

  try {
    return await parseCareContent([
      { type: "input_text", text: careContext(context) },
      { type: "input_text", text: `Forwarded message:\n\n${trimmed}` }
    ]);
  } catch {
    return { result: mockExtraction(), mode: "mock", reason: "openai_error" };
  }
}

export async function extractCareDocument({
  buffer,
  fileName,
  mimeType,
  context
}: ExtractCareDocumentInput): Promise<ExtractCareResult> {
  const client = getOpenAIClient();
  if (!client) {
    return { result: mockExtraction(), mode: "mock", reason: "missing_openai_key" };
  }

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  if (!isImage && !isPdf) {
    return { result: mockExtraction(), mode: "mock", reason: "unsupported_file_type" };
  }

  let uploadedOpenAIFileId: string | undefined;

  try {
    const content: Array<
      | { type: "input_text"; text: string }
      | { type: "input_image"; image_url: string; detail: "high" }
      | { type: "input_file"; file_id: string }
    > = [{ type: "input_text", text: careContext(context) }];

    if (isImage) {
      content.push({
        type: "input_image",
        image_url: `data:${mimeType};base64,${buffer.toString("base64")}`,
        detail: "high"
      });
    } else {
      const fileBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const uploaded = await client.files.create({
        file: new File([fileBuffer], fileName || "care-document.pdf", { type: mimeType || "application/pdf" }),
        purpose: "user_data"
      });
      uploadedOpenAIFileId = uploaded.id;
      content.push({ type: "input_file", file_id: uploaded.id });
    }

    return await parseCareContent(content);
  } catch {
    return { result: mockExtraction(), mode: "mock", reason: "openai_error" };
  } finally {
    if (uploadedOpenAIFileId) {
      void client.files.delete(uploadedOpenAIFileId).catch(() => undefined);
    }
  }
}
