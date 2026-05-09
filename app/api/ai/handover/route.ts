import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";

import { handoverSchema } from "@/lib/ai/schemas";
import { mockHandover } from "@/lib/ai/mock";
import { getOpenAIClient, OPENAI_MODEL, parsedOutput } from "@/lib/ai/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const rangeLabel = String(body.rangeLabel ?? "Next 7 days");
  const client = getOpenAIClient();

  if (!client) {
    return NextResponse.json({ result: mockHandover(rangeLabel), mode: "mock" });
  }

  try {
    const response = await client.responses.parse({
      model: OPENAI_MODEL,
      reasoning: { effort: "low" },
      text: {
        verbosity: "low",
        format: zodTextFormat(handoverSchema, "tandem_handover")
      },
      input: [
        {
          role: "system",
          content:
            "Generate a neutral, family-friendly caregiving handover for adult children caring for an ageing parent in Singapore. Coordination only; do not diagnose or make medical recommendations. Mention that medication items are reminders/notes when relevant."
        },
        {
          role: "user",
          content: `Range: ${rangeLabel}\nReason: ${body.reason ?? "General coverage"}\nData JSON:\n${JSON.stringify(body.data).slice(0, 18000)}`
        }
      ]
    });

    return NextResponse.json({ result: parsedOutput(response), mode: "openai" });
  } catch {
    return NextResponse.json({ result: mockHandover(rangeLabel), mode: "mock" });
  }
}
