import { zodTextFormat } from "openai/helpers/zod";

import { mockVoice } from "@/lib/ai/mock";
import { getOpenAIClient, OPENAI_MODEL, OPENAI_TRANSCRIBE_MODEL, parsedOutput } from "@/lib/ai/openai";
import { voiceSchema } from "@/lib/ai/schemas";
import type { ExtractionResult, VoiceResult } from "@/lib/types";

type ExtractCareVoiceInput = {
  text?: string;
  file?: File;
};

type ExtractCareVoiceResult = {
  result: VoiceResult;
  mode: "mock" | "openai";
  reason?: string;
};

export async function extractCareVoice({ text = "", file }: ExtractCareVoiceInput): Promise<ExtractCareVoiceResult> {
  const client = getOpenAIClient();
  if (!client) {
    return { result: mockVoice(text), mode: "mock", reason: "missing_openai_key" };
  }

  try {
    let transcript = text.trim();

    if (file && file.size > 0) {
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
      return { result: mockVoice(), mode: "mock", reason: "empty_transcript" };
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
            text.trim() && file ? `Extra typed context: ${text.trim()}\n` : ""
          }Transcript:\n${transcript}`
        }
      ]
    });

    return { result: parsedOutput<VoiceResult>(response), mode: "openai" };
  } catch {
    return { result: mockVoice(text), mode: "mock", reason: "openai_error" };
  }
}

export function voiceResultToExtraction(result: VoiceResult): ExtractionResult {
  return {
    document_type: "Voice update",
    plain_english_summary: result.update_note,
    important_dates: [],
    people_or_institutions: [],
    medications_or_care_items: [],
    recommended_tasks: [result.suggested_task],
    family_update_message: result.family_message
  };
}
