"use client";

import * as React from "react";
import { Loader2, MessageCircleQuestion, Send, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCareData } from "@/components/providers/care-data-provider";
import { formatDay } from "@/lib/date";

type ChatSource = {
  timeline_item_id?: string;
  title: string;
  date?: string;
  type?: string;
  excerpt?: string;
};

type ChatExchange = {
  id: string;
  question: string;
  answer: string;
  sources: ChatSource[];
  confidence: "high" | "medium" | "low" | "not_found";
  mode?: "openai" | "mock";
};

const SUGGESTED_QUESTIONS = [
  "What were her last vitals?",
  "Are there any active medication changes?",
  "When is the next appointment?",
  "Has there been any recent concern?"
];

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export function CareHistoryChat() {
  const data = useCareData();
  const [question, setQuestion] = React.useState("");
  const [exchanges, setExchanges] = React.useState<ChatExchange[]>([]);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function ask(text: string) {
    if (!text.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/care-history-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          data: {
            recipient: data.recipient,
            timeline: data.timeline,
            careSignals: data.careSignals,
            members: data.members
          }
        })
      });
      if (!response.ok) {
        throw new Error("Chat request failed");
      }
      const payload = (await response.json()) as {
        result: { answer: string; sources: ChatSource[]; confidence: ChatExchange["confidence"] };
        mode: "openai" | "mock";
      };
      setExchanges((prev) => [
        ...prev,
        {
          id: makeId(),
          question: text,
          answer: payload.result.answer,
          sources: payload.result.sources ?? [],
          confidence: payload.result.confidence ?? "low",
          mode: payload.mode
        }
      ]);
      setQuestion("");
    } catch {
      setError("Couldn't reach the assistant. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircleQuestion className="size-5 text-primary" />
          Ask about {data.recipient.name}&apos;s care
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {exchanges.length === 0 ? (
          <div className="rounded-2xl border bg-muted p-4 text-sm leading-6">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-primary" />
              Try a question
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => ask(suggestion)}
                  disabled={pending}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {exchanges.map((exchange) => (
              <div key={exchange.id} className="space-y-2">
                <div className="rounded-2xl border bg-primary/5 p-3 text-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question</div>
                  <div className="mt-1 leading-6">{exchange.question}</div>
                </div>
                <div className="rounded-2xl border bg-white/80 p-3 text-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wide text-muted-foreground">Answer</span>
                    <Badge
                      variant={
                        exchange.confidence === "high"
                          ? "success"
                          : exchange.confidence === "not_found"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {exchange.confidence}
                      {exchange.mode === "mock" ? " · mock" : ""}
                    </Badge>
                  </div>
                  <p className="mt-1 leading-6">{exchange.answer}</p>
                  {exchange.sources.length > 0 ? (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Sources
                      </div>
                      {exchange.sources.map((source, idx) => (
                        <div key={`${exchange.id}-src-${idx}`} className="rounded-xl bg-muted p-2 text-xs">
                          <div className="font-bold">
                            [{idx + 1}] {source.title}
                          </div>
                          <div className="text-muted-foreground">
                            {source.date ? formatDay(source.date) : null}
                            {source.type ? ` · ${source.type}` : null}
                          </div>
                          {source.excerpt ? (
                            <div className="mt-1 leading-5 text-muted-foreground">{source.excerpt}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
          className="flex gap-2"
        >
          <Input
            placeholder={`Ask about ${data.recipient.name}'s care…`}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={pending}
          />
          <Button type="submit" disabled={pending || !question.trim()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
