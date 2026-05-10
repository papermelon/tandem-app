import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";

import { meetingSchema } from "@/lib/ai/schemas";
import { mockMeeting } from "@/lib/ai/mock";
import { getOpenAIClient, OPENAI_MODEL, parsedOutput } from "@/lib/ai/openai";
import type { MeetingResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const notes = String(body.notes ?? "");
  const client = getOpenAIClient();

  if (!client || notes.trim().length < 20) {
    return NextResponse.json({ result: mockMeeting(), mode: "mock" });
  }

  try {
    const response = await client.responses.parse({
      model: OPENAI_MODEL,
      reasoning: { effort: "low" },
      text: {
        verbosity: "low",
        format: zodTextFormat(meetingSchema, "tandem_meeting_notes")
      },
      input: [
        {
          role: "system",
          content:
            "Turn family caregiving meeting notes into a concise summary, decisions, tasks, open questions, neutral risks, and reminders. Use warm, non-judgmental language. Do not diagnose or provide medical advice."
        },
        {
          role: "user",
          content: `Family: lead caregiver, Ming, Lina. Care recipient: Ah Muay, 78, mild dementia, recent fall. Notes:\n${notes}`
        }
      ]
    });

    return NextResponse.json({ result: parsedOutput<MeetingResult>(response), mode: "openai" });
  } catch {
    return NextResponse.json({ result: mockMeeting(), mode: "mock" });
  }
}
