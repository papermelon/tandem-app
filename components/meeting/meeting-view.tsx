"use client";

import * as React from "react";
import { Check, Loader2, MessagesSquare, Plus, Sparkles } from "lucide-react";

import { PageHeading } from "@/components/shared/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCareData } from "@/components/providers/care-data-provider";
import { categoryLabels } from "@/lib/labels";
import { normalizeDueDate } from "@/lib/task-utils";
import type { MeetingResult } from "@/lib/types";

function sampleNotes(leadName: string) {
  return `${leadName}: I can keep doing medication reminders but transport is hard this week. Ming: I can take one morning if I know the appointment details early. Lina: I can handle HDB EASE and AIC paperwork but need the latest doctor memo. Decision: Ming checks rehab transport tomorrow, Lina follows up on contractor quote, ${leadName} updates medication list. Open question: who is backup if Ah Muay refuses to leave for rehab?`;
}

export function MeetingView() {
  const { addTasks, addTimelineItem, memberIdByName, memberName } = useCareData();
  const leadName = memberName("rachel");
  const [notes, setNotes] = React.useState(() => sampleNotes(leadName));
  const [result, setResult] = React.useState<MeetingResult | null>(null);
  const [mode, setMode] = React.useState<"mock" | "openai" | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function generate() {
    setLoading(true);
    setSaved(false);
    try {
      const response = await fetch("/api/ai/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      const payload = (await response.json()) as { result: MeetingResult; mode: "mock" | "openai" };
      setResult(payload.result);
      setMode(payload.mode);
    } finally {
      setLoading(false);
    }
  }

  function addGeneratedTasks() {
    if (!result) return;
    const created = addTasks(
      result.assigned_tasks.map((task) => {
        const assigneeId = memberIdByName(task.assignee);
        return {
          title: task.title,
          category: task.category,
          assigneeId,
          dueDate: normalizeDueDate(task.due_date),
          status: assigneeId ? "claimed" : "unclaimed",
          priority: task.priority,
          notes: result.summary
        };
      })
    );

    addTimelineItem({
      type: "meeting summary",
      title: "Family meeting decisions added",
      description: result.summary,
      authorId: "ming",
      linkedTaskIds: created.map((task) => task.id)
    });
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeading
        eyebrow="Family Meeting Assistant"
        title="Turn discussion into neutral next steps"
        description="Paste notes or a transcript. Tandem drafts decisions, tasks, questions, risks, and reminders for review."
        icon={MessagesSquare}
      />

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Meeting notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-72" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Generate
              </Button>
              <Button variant="outline" onClick={() => setNotes(sampleNotes(leadName))}>
                Use sample
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Review output</CardTitle>
              {mode ? <Badge variant={mode === "openai" ? "success" : "warning"}>{mode}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="grid min-h-96 place-items-center rounded-3xl bg-muted p-6 text-center">
                <div>
                  <MessagesSquare className="mx-auto size-8 text-primary" />
                  <div className="mt-3 font-bold">Meeting summary appears here</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Generated tasks remain drafts until added.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Badge variant="secondary">Review before saving</Badge>
                <MeetingSection title="Summary" items={[result.summary]} />
                <MeetingSection title="Decisions made" items={result.decisions_made} />
                <div>
                  <div className="mb-2 font-bold">Assigned tasks</div>
                  <div className="space-y-2">
                    {result.assigned_tasks.map((task) => (
                      <div key={task.title} className="rounded-2xl border bg-white/70 p-3">
                        <div className="font-semibold">{task.title}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge>{task.assignee}</Badge>
                          <Badge variant="outline">{categoryLabels[task.category]}</Badge>
                          <Badge variant={task.priority === "high" ? "alert" : "default"}>{task.priority}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <MeetingSection title="Open questions" items={result.open_questions} />
                <MeetingSection title="Unresolved risks" items={result.unresolved_risks} />
                <MeetingSection title="Follow-up reminders" items={result.follow_up_reminders} />
                <Button onClick={addGeneratedTasks} disabled={saved} className="w-full">
                  {saved ? <Check /> : <Plus />}
                  {saved ? "Added to Tandem" : "Create tasks from decisions"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MeetingSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 font-bold">{title}</div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl bg-muted px-3 py-2 text-sm leading-6">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
