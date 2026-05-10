import { NextResponse } from "next/server";

import { extractCareDocument, extractCareText } from "@/lib/ai/extract-care-document";
import { extractCareVoice, voiceResultToExtraction } from "@/lib/ai/extract-care-voice";
import { mockExtraction } from "@/lib/ai/mock";
import { createCaptureFromExtraction } from "@/lib/captures";
import { getErrorMessage } from "@/lib/error-message";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { CaptureSourceType, ExtractionResult, VoiceResult } from "@/lib/types";

export const runtime = "nodejs";

const supportedSourceTypes = new Set<CaptureSourceType>(["text", "image", "document", "voice"]);

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function sourceTypeFromFile(file: File): CaptureSourceType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "voice";
  return "document";
}

function validateSourceFile(file: File, sourceType: CaptureSourceType) {
  if (sourceType === "image" && file.type.startsWith("image/")) return;
  if (sourceType === "document" && file.type === "application/pdf") return;
  if (sourceType === "voice" && file.type.startsWith("audio/")) return;
  throw new Error("Unsupported file type for this capture source.");
}

async function uploadWebFile(file: File, buffer: Buffer, sourceType: CaptureSourceType) {
  const supabase = createSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server environment is not configured.");

  const folder = sourceType === "voice" ? "voice" : "web";
  const storagePath = `${folder}/${Date.now()}-${safeFileName(file.name || `${sourceType}-capture`)}`;
  const { error } = await supabase.storage.from("documents").upload(storagePath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true
  });
  if (error) throw error;

  return storagePath;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const requestedSourceType = String(formData.get("sourceType") ?? "text") as CaptureSourceType;
  const context = String(formData.get("context") ?? "");
  const text = String(formData.get("text") ?? "");
  const demo = String(formData.get("demo") ?? "") === "true";
  const careRecipientId = String(formData.get("careRecipientId") ?? "");
  const file = formData.get("file");

  try {
    if (!supportedSourceTypes.has(requestedSourceType)) {
      return NextResponse.json({ ok: false, error: "Unsupported capture source." }, { status: 400 });
    }

    let sourceType = requestedSourceType;
    let result: ExtractionResult;
    let mode: "mock" | "openai" = "mock";
    let originalFilePath: string | undefined;
    let originalFileName: string | undefined;
    let originalFileMimeType: string | undefined;
    let extractedText: string | undefined;
    let voiceResult: VoiceResult | undefined;
    let careCircleId: string | undefined;

    if (careRecipientId) {
      const supabase = createSupabaseAdmin();
      if (!supabase) throw new Error("Supabase server environment is not configured.");
      const recipientResult = await supabase
        .from("care_recipients")
        .select("care_circle_id")
        .eq("id", careRecipientId)
        .maybeSingle();
      if (recipientResult.error) throw recipientResult.error;
      careCircleId = recipientResult.data?.care_circle_id;
    }

    if (demo) {
      result = mockExtraction();
    } else if (file instanceof File && file.size > 0) {
      sourceType = sourceTypeFromFile(file);
      validateSourceFile(file, sourceType);

      const buffer = Buffer.from(await file.arrayBuffer());
      originalFilePath = await uploadWebFile(file, buffer, sourceType);
      originalFileName = file.name;
      originalFileMimeType = file.type;

      if (sourceType === "voice") {
        const voice = await extractCareVoice({ text: context || text, file });
        voiceResult = voice.result;
        result = voiceResultToExtraction(voice.result);
        extractedText = voice.result.transcript;
        mode = voice.mode;
      } else {
        const extraction = await extractCareDocument({
          buffer,
          fileName: file.name || "care-document",
          mimeType: file.type,
          context
        });
        result = extraction.result;
        mode = extraction.mode;
      }
    } else if (requestedSourceType === "voice") {
      const voice = await extractCareVoice({ text: text || context });
      voiceResult = voice.result;
      result = voiceResultToExtraction(voice.result);
      extractedText = voice.result.transcript;
      mode = voice.mode;
    } else {
      const extraction = await extractCareText({ text: text || context, context });
      result = extraction.result;
      mode = extraction.mode;
      sourceType = "text";
    }

    const captureId = await createCaptureFromExtraction({
      platform: "web",
      sourceType,
      result,
      senderName: "Web caregiver",
      originalFilePath,
      originalFileName,
      originalFileMimeType,
      rawText: text || context || undefined,
      extractedText,
      careCircleId
    });

    return NextResponse.json({
      ok: true,
      captureId,
      result,
      voiceResult,
      mode,
      reviewUrl: `/inbox?capture=${encodeURIComponent(captureId)}`
    });
  } catch (error) {
    console.error("Web capture ingest failed", error);
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error, "Could not create review item.") },
      { status: 500 }
    );
  }
}
