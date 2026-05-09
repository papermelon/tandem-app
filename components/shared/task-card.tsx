"use client";

import { CalendarClock, Check, CircleAlert, Link2, UserPlus } from "lucide-react";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useCareData } from "@/components/providers/care-data-provider";
import { formatDay, formatRelative, formatTime } from "@/lib/date";
import { categoryLabels, priorityLabels, statusLabels } from "@/lib/labels";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusVariant = {
  unclaimed: "warning",
  claimed: "default",
  done: "success",
  blocked: "alert"
} as const;

export function TaskCard({
  task,
  compact = false,
  prominent = false
}: {
  task: Task;
  compact?: boolean;
  prominent?: boolean;
}) {
  const { members, updateTask, memberName } = useCareData();
  const assignee = members.find((member) => member.id === task.assigneeId);

  return (
    <Card
      className={cn(
        "overflow-hidden",
        prominent && task.status === "unclaimed" && "border-secondary/60 bg-secondary/10"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant[task.status]}>{statusLabels[task.status]}</Badge>
              <Badge variant="outline">{categoryLabels[task.category]}</Badge>
              <Badge variant={task.priority === "high" ? "alert" : task.priority === "medium" ? "warning" : "default"}>
                {priorityLabels[task.priority]}
              </Badge>
            </div>
            <h3 className="text-base font-bold leading-6">{task.title}</h3>
            {!compact && task.notes ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{task.notes}</p> : null}
          </div>
          {assignee ? <MemberAvatar avatar={assignee.avatar} name={assignee.name} /> : <UserPlus className="mt-1 size-5 text-secondary" />}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium">
            <CalendarClock className="size-3.5" />
            {formatRelative(task.dueDate)} · {formatTime(task.dueDate)}
          </span>
          {task.linkedRecordId || task.linkedTimelineId ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium">
              <Link2 className="size-3.5" />
              Linked record
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={task.assigneeId ?? ""}
            aria-label={`Assign ${task.title}`}
            onChange={(event) =>
              updateTask(task.id, {
                assigneeId: event.target.value || undefined,
                status: event.target.value ? "claimed" : "unclaimed"
              })
            }
            className="w-full sm:w-48"
          >
            <option value="">Unclaimed</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-2 sm:ml-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={task.status === "blocked"}
              onClick={() => updateTask(task.id, { status: "done" })}
            >
              <Check />
              Done
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateTask(task.id, { status: task.status === "blocked" ? "claimed" : "blocked" })}
            >
              <CircleAlert />
              {task.status === "blocked" ? "Unblock" : "Flag"}
            </Button>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          {task.status === "unclaimed" ? "Open for anyone who has capacity." : `With ${memberName(task.assigneeId)} · due ${formatDay(task.dueDate)}`}
        </div>
      </div>
    </Card>
  );
}
