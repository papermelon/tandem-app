import { NextResponse } from "next/server";

import { extractCareDocument } from "@/lib/ai/extract-care-document";
import { mockExtraction } from "@/lib/ai/mock";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const context = String(formData.get("context") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ result: mockExtraction(), mode: "mock" });
  }

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  if (!isImage && !isPdf) {
    return NextResponse.json({ error: "Only image and PDF documents are supported." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();

  try {
    const extraction = await extractCareDocument({
      buffer: Buffer.from(arrayBuffer),
      fileName: file.name || "care-document",
      mimeType: file.type,
      context
    });

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

    return NextResponse.json({ ...extraction, storagePath });
  } catch {
    return NextResponse.json({ result: mockExtraction(), mode: "mock" });
  }
}
