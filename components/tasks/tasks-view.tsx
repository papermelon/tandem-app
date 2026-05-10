"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, Filter, Plane } from "lucide-react";

import { PageHeading } from "@/components/shared/page-heading";
import { TaskCard } from "@/components/shared/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useCareData } from "@/components/providers/care-data-provider";
import { categoryLabels, statusLabels } from "@/lib/labels";
import type { TaskCategory, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusFilters: Array<TaskStatus | "all"> = ["all", "unclaimed", "claimed", "blocked", "done"];
const categoryFilters: Array<TaskCategory | "all"> = [
  "all",
  "appointment",
  "transport",
  "medication",
  "admin",
  "finance",
  "check-in",
  "home safety"
];

export function TasksView() {
  const { tasks, handoverSessions } = useCareData();
  const activeHandover = (handoverSessions ?? []).find(
    (session) => session.status === "pending" || session.status === "in-progress"
  );
  const [status, setStatus] = React.useState<TaskStatus | "all">("all");
  const [category, setCategory] = React.useState<TaskCategory | "all">("all");

  const filtered = tasks
    .filter((task) => status === "all" || task.status === status)
    .filter((task) => category === "all" || task.category === category)
    .sort((a, b) => {
      if (a.status === "unclaimed" && b.status !== "unclaimed") return -1;
      if (a.status !== "unclaimed" && b.status === "unclaimed") return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const unclaimedCount = tasks.filter((task) => task.status === "unclaimed").length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        eyebrow="Tasks"
        title="Know who is doing what"
        description="Keep appointments, paperwork, transport, and check-ins in one place so help is easier to offer."
        icon={ClipboardList}
      />

      {activeHandover ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Plane className="size-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold">Handover in progress</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              The incoming caregiver hasn&apos;t finished acknowledging yet. Complete the handover before relying on
              task assignments.
            </p>
            <div className="mt-2 flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`/handover/${activeHandover.id}/share`}>View QR</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/handover/${activeHandover.id}`}>Open handover</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4 rounded-2xl border border-secondary/40 bg-secondary/10 p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
            <Filter className="size-5" />
          </div>
          <div>
            <div className="font-bold">{unclaimedCount} tasks need someone to take them</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              These are open spots where another family member can step in with the context they need.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusFilters.map((item) => (
            <button
              key={item}
              onClick={() => setStatus(item)}
              className={cn(
                "shrink-0 rounded-full border bg-white/75 px-3 py-2 text-xs font-semibold text-muted-foreground",
                status === item && "border-primary/30 bg-primary/10 text-primary"
              )}
            >
              {item === "all" ? "All" : statusLabels[item]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Category</span>
          <Select value={category} onChange={(event) => setCategory(event.target.value as TaskCategory | "all")}>
            {categoryFilters.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All categories" : categoryLabels[item]}
              </option>
            ))}
          </Select>
          <Badge variant="outline" className="ml-auto">{filtered.length} shown</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((task) => (
          <TaskCard key={task.id} task={task} prominent={task.status === "unclaimed"} />
        ))}
      </div>
    </div>
  );
}
