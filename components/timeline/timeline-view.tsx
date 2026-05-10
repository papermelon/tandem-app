"use client";

import * as React from "react";
import { CalendarCheck, ClipboardPlus, FileText, MessageSquare, Mic, Plus, UserRoundPlus } from "lucide-react";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { PageHeading } from "@/components/shared/page-heading";
import { SignalPill } from "@/components/shared/signal-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCareData } from "@/components/providers/care-data-provider";
import { formatDay, formatRelative, formatTime, offsetDate } from "@/lib/date";
import { timelineLabels } from "@/lib/labels";
import type { TimelineItem, TimelineType } from "@/lib/types";
import { cn } from "@/lib/utils";

const iconByType: Record<TimelineType, React.ElementType> = {
  note: MessageSquare,
  document: FileText,
  appointment: CalendarCheck,
  task: ClipboardPlus,
  "voice update": Mic,
  "meeting summary": MessageSquare,
  "care signal": CalendarCheck
};

const filters: Array<TimelineType | "all"> = ["all", "care signal", "document", "appointment", "voice update", "meeting summary"];

export function TimelineView() {
  const { timeline, members, tasks, memberName, addTasks } = useCareData();
  const [filter, setFilter] = React.useState<TimelineType | "all">("all");
  const visibleItems = filter === "all" ? timeline : timeline.filter((item) => item.type === filter);

  function createFollowUp(item: TimelineItem) {
    addTasks([
      {
        title: `Follow up: ${item.title}`,
        category: item.type === "document" ? "admin" : item.type === "appointment" ? "appointment" : "check-in",
        dueDate: offsetDate(1, 18, 0),
        status: "unclaimed",
        priority: item.severity === "alert" ? "high" : "medium",
        linkedTimelineId: item.id,
        notes: item.description
      }
    ]);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading
        eyebrow="Timeline"
        title="The story so far"
        description="A simple family feed for updates, decisions, documents, and moments that need follow-up."
        icon={MessageSquare}
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={cn(
              "shrink-0 rounded-full border bg-white/75 px-3 py-2 text-xs font-semibold text-muted-foreground",
              filter === item && "border-primary/30 bg-primary/10 text-primary"
            )}
          >
            {item === "all" ? "All updates" : timelineLabels[item]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visibleItems.map((item) => {
          const author = members.find((member) => member.id === item.authorId);
          const Icon = iconByType[item.type];
          const linkedTasks = tasks.filter((task) => item.linkedTaskIds?.includes(task.id));

          return (
            <Card key={item.id} className={cn("p-4", item.severity === "alert" && "border-destructive/30 bg-destructive/5")}>
              <div className="flex gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{timelineLabels[item.type]}</Badge>
                    {item.severity ? <SignalPill severity={item.severity} /> : null}
                    <span className="text-xs text-muted-foreground">{formatRelative(item.timestamp)} · {formatTime(item.timestamp)}</span>
                  </div>
                  <h2 className="mt-2 text-lg font-bold leading-6">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>

                  {linkedTasks.length ? (
                    <div className="mt-3 space-y-2">
                      {linkedTasks.map((task) => (
                        <div key={task.id} className="rounded-2xl bg-muted px-3 py-2 text-sm">
                          <span className="font-semibold">{task.title}</span>
                          <span className="text-muted-foreground"> · {memberName(task.assigneeId)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="soft" size="sm" onClick={() => createFollowUp(item)}>
                      <Plus />
                      Add follow-up
                    </Button>
                    <Button variant="outline" size="sm">
                      <UserRoundPlus />
                      Assign
                    </Button>
                    <Button variant="ghost" size="sm">
                      <CalendarCheck />
                      Add reminder
                    </Button>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    {author ? <MemberAvatar avatar={author.avatar} name={author.name} className="size-6 text-xs" /> : null}
                    {author?.name ?? "Family"} · {formatDay(item.timestamp)}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
