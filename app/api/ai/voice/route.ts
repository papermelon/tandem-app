import { NextResponse } from "next/server";

import { extractCareVoice } from "@/lib/ai/extract-care-voice";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const text = String(formData.get("text") ?? "");
  const file = formData.get("audio");

  const extraction = await extractCareVoice({
    text,
    file: file instanceof File ? file : undefined
  });

  return NextResponse.json({ result: extraction.result, mode: extraction.mode });
}
