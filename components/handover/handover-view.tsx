"use client";

import * as React from "react";
import { Check, Loader2, Plane, Sparkles, UserRoundCheck } from "lucide-react";

import { MobilePageHeader } from "@/components/dashboard/home/mobile-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCareData } from "@/components/providers/care-data-provider";
import type { Handover } from "@/lib/types";
import { HandoverShareCard } from "./handover-share-card";

type HandoverResult = {
  current_situation: string;
  upcoming_appointments: string[];
  active_tasks: string[];
  medication_care_reminders: string[];
  unresolved_admin_matters: string[];
  recent_concerns: string[];
  who_is_doing_what: string[];
  suggested_next_actions: string[];
};

const options = ["Next 3 days", "Next 7 days", "Custom range", "I'm away", "Someone else is stepping in"];

export function HandoverView() {
  const data = useCareData();
  const [rangeLabel, setRangeLabel] = React.useState("Next 7 days");
  const [result, setResult] = React.useState<HandoverResult | null>(null);
  const [mode, setMode] = React.useState<"mock" | "openai" | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function generate() {
    setLoading(true);
    setSaved(false);
    try {
      const response = await fetch("/api/ai/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rangeLabel,
          reason: rangeLabel.includes("travelling") ? "Primary caregiver is travelling" : rangeLabel,
          data: {
            recipient: data.recipient,
            tasks: data.tasks,
            timeline: data.timeline,
            careSignals: data.careSignals,
            members: data.members
          }
        })
      });
      const payload = (await response.json()) as { result: HandoverResult; mode: "mock" | "openai" };
      setResult(payload.result);
      setMode(payload.mode);
    } finally {
      setLoading(false);
    }
  }

  function saveHandover() {
    if (!result) return;
    const handover: Omit<Handover, "id" | "createdAt"> = {
      rangeLabel,
      currentSituation: result.current_situation,
      upcomingAppointments: result.upcoming_appointments,
      activeTasks: result.active_tasks,
      medicationReminders: result.medication_care_reminders,
      unresolvedAdmin: result.unresolved_admin_matters,
      recentConcerns: result.recent_concerns,
      whoIsDoingWhat: result.who_is_doing_what,
      suggestedNextActions: result.suggested_next_actions
    };
    const savedHandover = data.addHandover(handover);
    data.addTimelineItem({
      type: "meeting summary",
      title: `${rangeLabel} handover generated`,
      description: result.current_situation,
      authorId: "rachel",
      linkedRecordId: savedHandover.id
    });
    setSaved(true);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-24">
      <MobilePageHeader title="Handover" icon={Plane} />

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>What should they know?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => setRangeLabel(option)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left font-semibold ${
                  rangeLabel === option ? "border-primary/40 bg-primary/10 text-primary" : "bg-white/70"
                }`}
              >
                {option.includes("travelling") ? <Plane className="size-4" /> : <UserRoundCheck className="size-4" />}
                {option}
              </button>
            ))}
            <Button onClick={generate} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Prepare handover
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Ready to share</CardTitle>
              {mode ? <Badge variant={mode === "openai" ? "success" : "warning"}>{mode}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="grid min-h-96 place-items-center rounded-3xl bg-muted p-6 text-center">
                <div>
                  <Sparkles className="mx-auto size-8 text-primary" />
                  <div className="mt-3 font-bold">Your handover will appear here</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a time window and Tandem will gather the key context.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Badge variant="secondary">Check before sharing</Badge>
                <HandoverSection title="Current situation" items={[result.current_situation]} />
                <HandoverSection title="Upcoming appointments" items={result.upcoming_appointments} />
                <HandoverSection title="Active tasks" items={result.active_tasks} />
                <HandoverSection title="Medication and care reminders" items={result.medication_care_reminders} />
                <HandoverSection title="Unresolved admin matters" items={result.unresolved_admin_matters} />
                <HandoverSection title="Recent concerns" items={result.recent_concerns} />
                <HandoverSection title="Who is doing what" items={result.who_is_doing_what} />
                <HandoverSection title="Suggested next actions" items={result.suggested_next_actions} />
                <Button onClick={saveHandover} disabled={saved} className="w-full">
                  <Check />
                  {saved ? "Saved to timeline" : "Save handover"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4">
        <HandoverShareCard />
      </section>
    </div>
  );
}

function HandoverSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 font-bold">{title}</div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border bg-white/70 p-3 text-sm leading-6">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
