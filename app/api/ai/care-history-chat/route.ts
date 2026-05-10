import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";

import { careHistoryChatSchema } from "@/lib/ai/schemas";
import { getOpenAIClient, OPENAI_MODEL, parsedOutput } from "@/lib/ai/openai";

export const runtime = "nodejs";

type CareHistoryChatResult = {
  answer: string;
  sources: Array<{
    timeline_item_id?: string;
    title: string;
    date?: string;
    type?: string;
    excerpt?: string;
  }>;
  confidence: "high" | "medium" | "low" | "not_found";
};

type TimelineLite = {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
};

function mockAnswer(question: string, timeline: TimelineLite[] = []): CareHistoryChatResult {
  const q = question.toLowerCase();
  const matches = timeline
    .filter((item) => {
      const haystack = `${item.title} ${item.description}`.toLowerCase();
      return q
        .split(/\s+/)
        .filter((token) => token.length > 3)
        .some((token) => haystack.includes(token));
    })
    .slice(0, 3);

  if (matches.length === 0) {
    return {
      answer: `I couldn't find anything in the care history that matches "${question}". Ask the primary caregiver for the most recent update.`,
      sources: [],
      confidence: "not_found"
    };
  }

  const top = matches[0];
  return {
    answer: `Based on the care history, the most relevant entry is "${top.title}" from ${new Date(top.timestamp).toLocaleDateString()}. ${top.description}`,
    sources: matches.map((item) => ({
      timeline_item_id: item.id,
      title: item.title,
      date: item.timestamp,
      type: item.type,
      excerpt: item.description.slice(0, 200)
    })),
    confidence: matches.length > 1 ? "medium" : "low"
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    question?: string;
    data?: { timeline?: TimelineLite[]; recipient?: unknown; careSignals?: unknown };
  };
  const question = String(body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Question required" }, { status: 400 });
  }

  const timeline: TimelineLite[] = body.data?.timeline ?? [];
  const client = getOpenAIClient();

  if (!client) {
    return NextResponse.json({ result: mockAnswer(question, timeline), mode: "mock" });
  }

  try {
    const response = await client.responses.parse({
      model: OPENAI_MODEL,
      reasoning: { effort: "low" },
      text: {
        verbosity: "low",
        format: zodTextFormat(careHistoryChatSchema, "tandem_care_history_chat")
      },
      input: [
        {
          role: "system",
          content:
            "You answer caregiver questions about a patient's recent care history. Use only the timeline data provided. Cite sources by timeline_item_id when possible. If the answer is not in the data, say 'not_found' and suggest who might know. Never give medical advice — only summarize what's recorded."
        },
        {
          role: "user",
          content: `Question: ${question}\n\nCare data JSON:\n${JSON.stringify(body.data ?? {}).slice(0, 18000)}`
        }
      ]
    });

    return NextResponse.json({ result: parsedOutput<CareHistoryChatResult>(response), mode: "openai" });
  } catch {
    return NextResponse.json({ result: mockAnswer(question, timeline), mode: "mock" });
  }
}
