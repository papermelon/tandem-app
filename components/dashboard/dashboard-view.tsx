"use client";

import Link from "next/link";
import { Activity, ArrowRight, CalendarDays, FileText, HeartPulse, LineChart, ShieldCheck, Sparkles } from "lucide-react";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { CareProfileSummary } from "@/components/shared/care-profile-summary";
import { PageHeading } from "@/components/shared/page-heading";
import { SignalPill } from "@/components/shared/signal-pill";
import { TaskCard } from "@/components/shared/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useCareData } from "@/components/providers/care-data-provider";
import { formatDay, formatRelative, formatTime } from "@/lib/date";
import { categoryLabels } from "@/lib/labels";

export function DashboardView() {
  const { recipient, members, tasks, timeline, careSignals, loadCategories, memberName } = useCareData();
  const todayPriorities = tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);
  const upcomingAppointments = tasks.filter((task) => task.category === "appointment" || task.category === "transport").slice(0, 3);
  const unclaimed = tasks.filter((task) => task.status === "unclaimed").slice(0, 3);
  const recentUpdates = timeline.slice(0, 4);
  const totalLoad = loadCategories.reduce(
    (acc, category) => {
      Object.entries(category.counts).forEach(([memberId, count]) => {
        acc[memberId] = (acc[memberId] ?? 0) + count;
      });
      return acc;
    },
    {} as Record<string, number>
  );
  const total = Object.values(totalLoad).reduce((sum, count) => sum + count, 0);
  const rachelPercent = Math.round(((totalLoad.rachel ?? 0) / total) * 100);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeading
        eyebrow="Family Care Hub"
        title={`${recipient.name}'s week at a glance`}
        description={`${recipient.age}, ${recipient.context}. Shared context for Rachel, Ming, and Lina without turning care into a cold dashboard.`}
        icon={HeartPulse}
        badge="Mock mode works without Supabase or OpenAI keys"
      />

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="secondary" className="border-white/20 bg-white/20 text-white">Today</Badge>
                <CardTitle className="mt-3 text-2xl">Rehab, medication, and one check-in to keep visible.</CardTitle>
              </div>
              <ShieldCheck className="size-8 opacity-90" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {todayPriorities.map((task) => (
                <div key={task.id} className="rounded-2xl bg-white/14 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] opacity-75">{categoryLabels[task.category]}</div>
                  <div className="mt-2 text-sm font-bold leading-5">{task.title}</div>
                  <div className="mt-2 text-xs opacity-80">{formatRelative(task.dueDate)} · {memberName(task.assigneeId)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              Care Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {careSignals.slice(0, 3).map((signal) => (
              <div key={signal.id} className="rounded-2xl border bg-white/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{signal.label}</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{signal.description}</div>
                  </div>
                  <SignalPill severity={signal.severity} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{formatTime(signal.timestamp)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardContent className="p-4">
            <CareProfileSummary profile={recipient.careProfile} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              Upcoming appointments
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tasks">View all <ArrowRight /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAppointments.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-white/70 p-3">
                <div className="min-w-0">
                  <div className="font-semibold leading-5">{task.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDay(task.dueDate)} · {formatTime(task.dueDate)}</div>
                </div>
                <Badge variant={task.status === "unclaimed" ? "warning" : "default"}>{memberName(task.assigneeId)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="size-5 text-primary" />
              Care load snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-bold">{rachelPercent}%</div>
                <div className="text-xs text-muted-foreground">Handled by Rachel this week</div>
              </div>
              <div className="flex -space-x-2">
                {members.map((member) => (
                  <MemberAvatar key={member.id} avatar={member.avatar} name={member.name} className="border-2 border-white" />
                ))}
              </div>
            </div>
            <ProgressBar value={rachelPercent} className="h-3" />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Rachel has handled most appointment-related tasks this week. Consider assigning the next transport task to another family member.
            </p>
            <Button asChild variant="soft" className="mt-4 w-full">
              <Link href="/load">Open care load</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Ready for someone to pick up</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tasks">Tasks</Link>
            </Button>
          </div>
          {unclaimed.map((task) => (
            <TaskCard key={task.id} task={task} compact prominent />
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent updates</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/timeline">Feed</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUpdates.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-2xl border bg-white/70 p-3">
                <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  {item.type === "document" ? <FileText className="size-4" /> : <Sparkles className="size-4" />}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold leading-5">{item.title}</div>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{item.description}</p>
                  <div className="mt-2 text-xs text-muted-foreground">{memberName(item.authorId)} · {formatRelative(item.timestamp)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Button asChild size="lg" variant="secondary">
          <Link href="/inbox">Review forwarded items</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/handover">Generate handover</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/capture">Manual upload</Link>
        </Button>
      </section>
    </div>
  );
}
