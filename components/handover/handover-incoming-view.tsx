"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  History,
  Plane,
  Users
} from "lucide-react";

import { useCareData } from "@/components/providers/care-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/date";
import type { HandoverAcknowledgments, HandoverSession } from "@/lib/types";

const TABS = [
  { key: "briefing", label: "Briefing", icon: FileText },
  { key: "history", label: "History", icon: History },
  { key: "appointments", label: "Appts", icon: Calendar },
  { key: "caregivers", label: "Team", icon: Users },
  { key: "checklist", label: "Checklist", icon: ClipboardList }
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatRemaining(ms: number) {
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export function HandoverIncomingView({ session }: { session: HandoverSession }) {
  const data = useCareData();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabKey>("briefing");
  const [now, setNow] = React.useState(() => Date.now());
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const expiresIn = new Date(session.expiresAt).getTime() - now;
  const expired = expiresIn <= 0 || session.status === "expired";
  const completed = session.status === "completed";

  const ackCount = TABS.filter((tab) => session.acknowledgments[tab.key]).length;
  const checklistDone = session.dailyChecklist.filter((item) => item.completed).length;
  const checklistAllDone = session.dailyChecklist.length > 0 && checklistDone === session.dailyChecklist.length;
  const allTabsAck = ackCount === TABS.length;
  const canFinish = allTabsAck && checklistAllDone && !expired && !completed;

  React.useEffect(() => {
    if (session.status === "pending" && !expired) {
      data.updateHandoverSession(session.id, { status: "in-progress" });
    }
  }, [session.id, session.status, expired, data]);

  function ack(key: keyof HandoverAcknowledgments) {
    if (session.acknowledgments[key]) return;
    data.updateHandoverSession(session.id, {
      acknowledgments: { ...session.acknowledgments, [key]: true }
    });
    const currentIndex = TABS.findIndex((tab) => tab.key === key);
    const nextTab = TABS[currentIndex + 1];
    if (nextTab) {
      setActiveTab(nextTab.key);
    }
  }

  function toggleChecklist(itemId: string) {
    data.updateHandoverSession(session.id, {
      dailyChecklist: session.dailyChecklist.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    });
  }

  function complete() {
    if (!canFinish || submitting) return;
    setSubmitting(true);
    const completedAt = new Date().toISOString();
    data.updateHandoverSession(session.id, {
      status: "completed",
      completedAt,
      fullyAcknowledgedAt: completedAt
    });
    data.addTimelineItem({
      type: "meeting summary",
      title: "Handover complete",
      description: `${data.memberName(session.departingCaregiverId)} handed over care to the next caregiver.`,
      authorId: session.departingCaregiverId,
      linkedRecordId: session.id
    });
    router.push(`/handover/${session.id}/complete`);
  }

  // Auto-advance to the completion screen once every tab is acknowledged and the checklist is done.
  const completeRef = React.useRef(complete);
  React.useEffect(() => {
    completeRef.current = complete;
  });
  React.useEffect(() => {
    if (canFinish) {
      completeRef.current();
    }
  }, [canFinish]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Plane className="size-5 text-primary" />
              Incoming handover
            </CardTitle>
            <Badge variant={completed ? "success" : expired ? "warning" : "secondary"}>
              {completed ? "complete" : expired ? "expired" : `${ackCount}/${TABS.length}`}
            </Badge>
          </div>
          <ProgressBar value={(ackCount / TABS.length) * 100} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>From {data.memberName(session.departingCaregiverId)}</span>
            <span className={expired ? "text-destructive" : ""}>
              <Clock className="mr-1 inline-block size-3" />
              {formatRemaining(expiresIn)}
            </span>
          </div>
        </CardHeader>
      </Card>

      {expired && !completed ? (
        <Card>
          <CardContent className="space-y-3 py-4 text-sm">
            <p>This handover has expired. Ask the departing caregiver to generate a new one.</p>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/handover">Back to handover</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const ack = session.acknowledgments[tab.key];
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1 rounded-2xl border px-1 py-2 text-[10px] font-semibold",
                    active && "border-primary/40 bg-primary/10 text-primary",
                    !active && ack && "bg-accent/15 text-accent",
                    !active && !ack && "bg-white/70 text-muted-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="w-full truncate text-center">{tab.label}</span>
                  {ack ? <Check className="size-3" /> : null}
                </button>
              );
            })}
          </div>

          {activeTab === "briefing" ? (
            <TabBriefing
              session={session}
              acknowledged={session.acknowledgments.briefing}
              onAck={() => ack("briefing")}
            />
          ) : null}
          {activeTab === "history" ? (
            <TabHistory
              session={session}
              acknowledged={session.acknowledgments.history}
              onAck={() => ack("history")}
            />
          ) : null}
          {activeTab === "appointments" ? (
            <TabAppointments
              session={session}
              acknowledged={session.acknowledgments.appointments}
              onAck={() => ack("appointments")}
            />
          ) : null}
          {activeTab === "caregivers" ? (
            <TabCaregivers
              session={session}
              acknowledged={session.acknowledgments.caregivers}
              onAck={() => ack("caregivers")}
            />
          ) : null}
          {activeTab === "checklist" ? (
            <TabChecklist
              session={session}
              acknowledged={session.acknowledgments.checklist}
              checklistAllDone={checklistAllDone}
              onAck={() => ack("checklist")}
              onToggle={toggleChecklist}
            />
          ) : null}

          {completed ? (
            <Button asChild className="w-full">
              <Link href={`/handover/${session.id}/complete`}>
                <CheckCircle2 className="size-4" />
                View handover summary
              </Link>
            </Button>
          ) : (
            <Button onClick={complete} disabled={!canFinish || submitting} className="w-full">
              <CheckCircle2 className="size-4" />
              {canFinish ? "Acknowledge & start caring" : `Complete all tabs (${ackCount}/${TABS.length})`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function AckButton({
  acknowledged,
  onAck,
  label,
  disabled
}: {
  acknowledged: boolean;
  onAck: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Button
      onClick={onAck}
      disabled={acknowledged || disabled}
      variant={acknowledged ? "outline" : "default"}
      className="w-full"
    >
      <Check className="size-4" />
      {acknowledged ? "Acknowledged" : label}
    </Button>
  );
}

function TabBriefing({
  session,
  acknowledged,
  onAck
}: {
  session: HandoverSession;
  acknowledged: boolean;
  onAck: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Briefing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-2xl border bg-white/70 p-3 text-sm leading-6">{session.briefing}</p>
        <AckButton acknowledged={acknowledged} onAck={onAck} label="I have read and understood" />
      </CardContent>
    </Card>
  );
}

function TabHistory({
  session,
  acknowledged,
  onAck
}: {
  session: HandoverSession;
  acknowledged: boolean;
  onAck: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Care history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {session.careHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
        ) : (
          session.careHistory.map((entry) => (
            <div key={entry.id} className="space-y-1 rounded-2xl border bg-white/70 p-3 text-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDay(entry.date)}</span>
              </div>
              <div className="font-bold">{entry.title}</div>
              {entry.note ? <p className="leading-6">{entry.note}</p> : null}
              {entry.images?.length ? (
                <div className="flex gap-2 overflow-x-auto pt-2">
                  {entry.images.map((image) => (
                    <img
                      key={image.id}
                      src={image.url}
                      alt={image.caption ?? entry.title}
                      className="size-20 shrink-0 rounded-xl object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
        <AckButton acknowledged={acknowledged} onAck={onAck} label="I understand the care history" />
      </CardContent>
    </Card>
  );
}

function TabAppointments({
  session,
  acknowledged,
  onAck
}: {
  session: HandoverSession;
  acknowledged: boolean;
  onAck: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming appointments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {session.upcomingAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
        ) : (
          session.upcomingAppointments.map((entry) => (
            <div key={entry.id} className="rounded-2xl border bg-white/70 p-3 text-sm">
              <div className="font-bold">{entry.title}</div>
              <div className="text-xs text-muted-foreground">
                {formatDay(entry.date)}
                {entry.time ? ` · ${entry.time}` : ""}
                {entry.location ? ` · ${entry.location}` : ""}
              </div>
            </div>
          ))
        )}
        <AckButton acknowledged={acknowledged} onAck={onAck} label="I have noted the appointments" />
      </CardContent>
    </Card>
  );
}

function TabCaregivers({
  session,
  acknowledged,
  onAck
}: {
  session: HandoverSession;
  acknowledged: boolean;
  onAck: () => void;
}) {
  const visible = session.otherCaregivers.filter((entry) => entry.available !== false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Other caregivers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No additional caregivers listed.</p>
        ) : (
          visible.map((entry) => (
            <div key={entry.memberId} className="flex items-center justify-between rounded-2xl border bg-white/70 p-3 text-sm">
              <div>
                <div className="font-bold">{entry.name}</div>
                <div className="text-xs text-muted-foreground">{entry.phone ?? "no phone"}</div>
              </div>
              <Badge variant={entry.loadPct < 60 ? "success" : "warning"}>{entry.loadPct}% load</Badge>
            </div>
          ))
        )}
        <AckButton acknowledged={acknowledged} onAck={onAck} label="I acknowledge the team" />
      </CardContent>
    </Card>
  );
}

function TabChecklist({
  session,
  acknowledged,
  checklistAllDone,
  onAck,
  onToggle
}: {
  session: HandoverSession;
  acknowledged: boolean;
  checklistAllDone: boolean;
  onAck: () => void;
  onToggle: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Tap each task to read details, then tick it once you understand.
        </p>
        {session.dailyChecklist.map((item) => {
          const open = expandedId === item.id;
          return (
            <div key={item.id} className="rounded-2xl border bg-white/70">
              <button
                onClick={() => setExpandedId(open ? null : item.id)}
                className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full border",
                      item.completed ? "border-primary bg-primary text-primary-foreground" : "bg-white"
                    )}
                  >
                    {item.completed ? <Check className="size-3" /> : null}
                  </span>
                  {item.label}
                </span>
                <span className="text-xs text-muted-foreground">{open ? "Hide" : "Open"}</span>
              </button>
              {open ? (
                <div className="space-y-3 border-t bg-white/50 p-3 text-sm leading-6">
                  {item.description ? <p>{item.description}</p> : <p className="text-muted-foreground">No extra notes.</p>}
                  <Button
                    variant={item.completed ? "outline" : "default"}
                    size="sm"
                    onClick={() => onToggle(item.id)}
                    className="w-full"
                  >
                    <Check className="size-3" />
                    {item.completed ? "Tap to undo" : "I understand this task"}
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
        <AckButton
          acknowledged={acknowledged}
          onAck={onAck}
          disabled={!checklistAllDone}
          label={checklistAllDone ? "I'm ready to start" : "Tick all items first"}
        />
        {!checklistAllDone ? (
          <p className="text-center text-xs text-muted-foreground">
            All checklist items must be ticked before this tab can be acknowledged.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
