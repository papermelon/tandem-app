import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";

import { mockVoice } from "@/lib/ai/mock";
import { voiceSchema } from "@/lib/ai/schemas";
import { getOpenAIClient, OPENAI_MODEL, OPENAI_TRANSCRIBE_MODEL, parsedOutput } from "@/lib/ai/openai";
import type { VoiceResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const text = String(formData.get("text") ?? "");
  const file = formData.get("audio");
  const client = getOpenAIClient();

  if (!client) {
    return NextResponse.json({ result: mockVoice(text), mode: "mock" });
  }

  try {
    let transcript = text.trim();

    if (file instanceof File && file.size > 0) {
      const audioFile = new File([await file.arrayBuffer()], file.name || "voice-update.webm", {
        type: file.type || "audio/webm"
      });
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: OPENAI_TRANSCRIBE_MODEL,
        prompt:
          "This is a Singapore family caregiving voice note about Ah Muay, Rachel's mum, rehab, polyclinic, SGH, HDB EASE, AIC grants, transport, helpers, medication reminders, and family task handover."
      });
      transcript = transcription.text;
    }

    if (!transcript) {
      return NextResponse.json({ result: mockVoice(), mode: "mock" });
    }

    const response = await client.responses.parse({
      model: OPENAI_MODEL,
      reasoning: { effort: "low" },
      text: {
        verbosity: "low",
        format: zodTextFormat(voiceSchema, "tandem_voice_task")
      },
      input: [
        {
          role: "system",
          content:
            "Convert a caregiving voice note into one reviewable update note, one suggested task, one reminder, and one family message. Coordination only. Do not diagnose or offer clinical recommendations."
        },
        {
          role: "user",
          content: `Family members: Rachel, Ming, Lina. Care recipient: Ah Muay, Rachel's mum, 78, mild dementia, recent fall. ${
            text.trim() && file instanceof File ? `Extra typed context: ${text.trim()}\n` : ""
          }Transcript:\n${transcript}`
        }
      ]
    });

    return NextResponse.json({ result: parsedOutput<VoiceResult>(response), mode: "openai" });
  } catch {
    return NextResponse.json({ result: mockVoice(text), mode: "mock" });
  }
}
