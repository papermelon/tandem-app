"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDay, formatTime } from "@/lib/date";
import type { TimelineItem } from "@/lib/types";

type View = "calendar" | "timeline";

type Props = {
  items: TimelineItem[];
};

function buildMonthMatrix(reference: Date) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return { year, month, cells };
}

export function UpcomingEventPreview({ items }: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const [view, setView] = React.useState<View>("calendar");
  const [now] = React.useState(() => Date.now());

  const upcoming = items
    .filter((i) => new Date(i.timestamp).getTime() >= now - 1000 * 60 * 60 * 24)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const next = upcoming[0];

  const reference = next ? new Date(next.timestamp) : new Date();
  const { year, month, cells } = buildMonthMatrix(reference);
  const eventDays = new Set(
    upcoming
      .filter((i) => {
        const d = new Date(i.timestamp);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((i) => new Date(i.timestamp).getDate()),
  );

  return (
    <Card>
      <CardContent className="p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Upcoming
            </span>
          </div>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        <div className="mt-2 text-sm font-semibold">
          {next ? `${formatDay(next.timestamp)} · ${next.title}` : "No upcoming events"}
        </div>

        {expanded ? (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2 rounded-full bg-muted p-1">
              {(["calendar", "timeline"] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "flex-1 rounded-full py-1.5 text-xs font-semibold capitalize transition-colors",
                    view === v ? "bg-white shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            {view === "calendar" ? (
              <div>
                <div className="mb-2 text-center text-xs font-semibold">
                  {reference.toLocaleString("default", { month: "long", year: "numeric" })}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
                  {cells.map((d, i) => (
                    <div
                      key={i}
                      className={cn(
                        "grid aspect-square place-items-center rounded-lg",
                        d == null ? "" : "border bg-white/60",
                        d != null && eventDays.has(d) && "border-primary bg-primary/15 font-bold text-primary",
                      )}
                    >
                      {d ?? ""}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {upcoming.slice(0, 6).map((i) => (
                  <li key={i.id} className="rounded-xl border bg-white/60 p-2">
                    <div className="text-sm font-semibold">{i.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDay(i.timestamp)} · {formatTime(i.timestamp)}
                    </div>
                  </li>
                ))}
                {upcoming.length === 0 ? (
                  <li className="text-xs text-muted-foreground">Nothing scheduled.</li>
                ) : null}
              </ul>
            )}

            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/timeline">View full timeline</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
