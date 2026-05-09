import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";

import { extractionSchema } from "@/lib/ai/schemas";
import { getOpenAIClient, OPENAI_MODEL, parsedOutput } from "@/lib/ai/openai";
import { mockExtraction } from "@/lib/ai/mock";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { ExtractionResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const context = String(formData.get("context") ?? "");
  const client = getOpenAIClient();

  if (!(file instanceof File)) {
    return NextResponse.json({ result: mockExtraction(), mode: "mock" });
  }

  if (!client) {
    return NextResponse.json({ result: mockExtraction(), mode: "mock", reason: "missing_openai_key" });
  }

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  if (!isImage && !isPdf) {
    return NextResponse.json({ error: "Only image and PDF documents are supported." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();

  try {
    const content: Array<
      | { type: "input_text"; text: string }
      | { type: "input_image"; image_url: string; detail: "high" }
      | { type: "input_file"; file_id: string }
    > = [
      {
        type: "input_text",
        text: `Care recipient: Mum, 78, mild dementia, recent fall. Family members: Rachel, Ming, Lina. Context from user: ${context || "No extra context."}`
      }
    ];
    let uploadedOpenAIFileId: string | undefined;

    if (isImage) {
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      content.push({
        type: "input_image",
        image_url: `data:${file.type};base64,${base64}`,
        detail: "high"
      });
    } else {
      const uploadFile = new File([arrayBuffer], file.name || "care-document.pdf", {
        type: file.type || "application/pdf"
      });
      const uploaded = await client.files.create({
        file: uploadFile,
        purpose: "user_data"
      });
      uploadedOpenAIFileId = uploaded.id;
      content.push({
        type: "input_file",
        file_id: uploaded.id
      });
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
          content:
            "Extract caregiving coordination information from Singapore family care documents. Do not diagnose, provide medical advice, or invent clinical recommendations. Medication items are reminders or document notes only. Return concise plain English and family-safe task suggestions that the user must review before saving."
        },
        {
          role: "user",
          content
        }
      ]
    });

    const result = parsedOutput<ExtractionResult>(response);

    let storagePath: string | undefined;
    const supabase = createSupabaseAdmin();
    if (supabase) {
      storagePath = `circle-mum/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error } = await supabase.storage.from("documents").upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: true
      });
      if (error) {
        storagePath = undefined;
      }
    }

    if (uploadedOpenAIFileId) {
      void client.files.delete(uploadedOpenAIFileId).catch(() => undefined);
    }

    return NextResponse.json({ result, mode: "openai", storagePath });
  } catch {
    return NextResponse.json({ result: mockExtraction(), mode: "mock" });
  }
}
