"use client";

import Link from "next/link";
import { ArrowRight, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelative } from "@/lib/date";
import type { Task } from "@/lib/types";

type Props = {
  tasks: Task[];
  resolveAssigneeName: (id?: string) => string;
  limit?: number;
};

export function DailyTasksPreview({ tasks, resolveAssigneeName, limit = 2 }: Props) {
  const open = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, limit);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Daily tasks
          </h3>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href="/tasks">
              See all
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>

        {open.length === 0 ? (
          <div className="text-sm text-muted-foreground">No tasks for today.</div>
        ) : (
          <ul className="space-y-2">
            {open.map((task) => (
              <li key={task.id} className="flex items-start gap-3 rounded-xl border bg-white/60 p-3">
                <Square className="mt-0.5 size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-5">{task.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {resolveAssigneeName(task.assigneeId)} · {formatRelative(task.dueDate)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
