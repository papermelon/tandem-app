import OpenAI from "openai";

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";
export const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function parsedOutput<T>(response: unknown): T {
  const outputParsed = (response as { output_parsed?: T }).output_parsed;
  if (outputParsed) return outputParsed;

  const output = (response as { output?: Array<{ type?: string; content?: Array<{ parsed?: T }> }> }).output;
  const parsed = output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.parsed)?.parsed;

  if (!parsed) {
    throw new Error("OpenAI response did not include parsed structured output.");
  }

  return parsed;
}
