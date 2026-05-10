"use client";

import { HandHeart, LineChart } from "lucide-react";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { PageHeading } from "@/components/shared/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useCareData } from "@/components/providers/care-data-provider";
import { summarizeMemberLoad, topCareLoadMember } from "@/lib/care-load";
import { categoryLabels } from "@/lib/labels";

export function LoadView() {
  const { members, loadCategories, memberName } = useCareData();
  const totals = summarizeMemberLoad(members, loadCategories);
  const heaviestLoad = topCareLoadMember(totals);
  const rachel = totals.find((member) => member.id === "rachel");
  const leadName = memberName("rachel");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeading
        eyebrow="Care Load Visibility"
        title="A shared view of effort"
        description="Designed to make invisible coordination visible without ranking anyone."
        icon={LineChart}
      />

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weekly contribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totals.map((member) => {
              return (
                <div key={member.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MemberAvatar avatar={member.avatar} name={member.name} className="size-8 text-xs" />
                      <div>
                        <div className="font-semibold">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.role}</div>
                      </div>
                    </div>
                    <Badge variant={member.id === heaviestLoad?.id ? "warning" : "default"}>{member.sharePct}%</Badge>
                  </div>
                  <ProgressBar value={member.sharePct} indicatorClassName={member.id === heaviestLoad?.id ? "bg-secondary" : undefined} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandHeart className="size-5 text-primary" />
              Gentle nudge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold leading-7">
              {heaviestLoad
                ? `${heaviestLoad.name} has handled ${heaviestLoad.sharePct}% of visible care actions this week. Consider assigning the next transferable task to someone with lighter load.`
                : "No care actions have been logged yet this week."}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This view focuses on transferability: what context is needed, what can be picked up, and where support can be shared.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {totals.map((member) => (
                <div key={member.id} className="rounded-2xl bg-white/80 p-3 text-center">
                  <div className="text-2xl font-bold">{member.count}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{member.name}</div>
                </div>
              ))}
            </div>
            {rachel ? (
              <div className="mt-4 rounded-2xl border bg-white/75 p-3 text-sm leading-6 text-muted-foreground">
                {leadName} has handled {rachel.count} visible care actions this week. Use this as context for planning, not as a score.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Category distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadCategories.map((category) => {
              const categoryTotal = Object.values(category.counts).reduce((sum, count) => sum + count, 0);
              return (
                <div key={category.category} className="rounded-2xl border bg-white/70 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="font-semibold">
                      {category.category === "document handling" ? "Document handling" : categoryLabels[category.category]}
                    </div>
                    <Badge variant="outline">{categoryTotal} actions</Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {members.map((member) => {
                      const count = category.counts[member.id] ?? 0;
                      const percent = categoryTotal ? Math.round((count / categoryTotal) * 100) : 0;
                      return (
                        <div key={member.id} className="rounded-xl bg-muted p-2">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-semibold">{member.name}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </div>
                          <ProgressBar value={percent} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
