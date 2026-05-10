"use client";

import * as React from "react";
import { Check, ClipboardCheck, Copy, Plane, QrCode, ShieldCheck, UserRoundCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { MobilePageHeader } from "@/components/dashboard/home/mobile-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCareData } from "@/components/providers/care-data-provider";
import type { Handover, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type HandoverReceipt = {
  reviewedSections: string[];
  notes: string;
  decisionRefs: string[];
  handoverId?: string;
};

type HandoverSession = {
  sessionId: string;
  careRecipientId: string;
  circleId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  scanToken: string;
  scannedBy?: string;
  completedAt?: string;
  checklistState: Record<string, boolean>;
  receipt?: HandoverReceipt;
};

const checklistTemplate = ["Medication", "Mobility", "Mood", "Where supplies are"];
const storageKeyPrefix = "tandem-trust-bridge-handover-v1";

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeToken(circleId: string) {
  const suffix = makeId("scan").replace("scan-", "").toUpperCase();
  return `HANDOVER|${circleId}|${suffix}`;
}

function formatDateTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function taskLabel(task: Task, memberName: (id?: string) => string) {
  const owner = task.assigneeId ? memberName(task.assigneeId) : "Unclaimed";
  return `${task.title} · ${owner}`;
}

function firstItems(items: string[], fallback: string, count = 4) {
  const filtered = items.filter(Boolean);
  return filtered.length ? filtered.slice(0, count) : [fallback];
}

export function HandoverView() {
  const data = useCareData();
  const [handover, setHandover] = React.useState<HandoverSession | null>(null);
  const [scanToken, setScanToken] = React.useState("");
  const [scanError, setScanError] = React.useState("");
  const [receiptNotes, setReceiptNotes] = React.useState(
    "Checklist reviewed in person and relevant care references were opened."
  );
  const storageKey = `${storageKeyPrefix}:${data.recipient.id}`;

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as HandoverSession) : null;
      setHandover(parsed?.careRecipientId === data.recipient.id ? parsed : null);
      setScanToken("");
    } catch {
      setHandover(null);
      setScanToken("");
    }
  }, [data.recipient.id, storageKey]);

  React.useEffect(() => {
    if (!handover) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(handover));
    } catch {
    }
  }, [handover, storageKey]);

  const leadCaregiverId = data.memberIdByName("lead caregiver") ?? "rachel";
  const incomingCaregiver = data.members.find((member) => !member.isDefaultCaregiver) ?? data.members[0];
  const activeHandover = handover && !handover.completedAt ? handover : null;
  const allChecked = activeHandover ? Object.values(activeHandover.checklistState).every(Boolean) : false;
  const reviewedSections = activeHandover
    ? Object.entries(activeHandover.checklistState)
        .filter(([, checked]) => checked)
        .map(([item]) => item)
    : [];

  const careReferences = React.useMemo(() => {
    const profileRefs =
      data.recipient.careProfile?.sections.map((section) =>
        section.notes?.length ? `${section.label}: ${section.value} (${section.notes.join("; ")})` : `${section.label}: ${section.value}`
      ) ?? [];
    const documentRefs = data.documents.slice(0, 3).map((document) => document.title);
    return firstItems([...profileRefs, ...documentRefs], "Care profile and recent documents stay available here.");
  }, [data.documents, data.recipient.careProfile?.sections]);

  const handoverPreview = React.useMemo<Omit<Handover, "id" | "createdAt">>(() => {
    const openTasks = data.tasks.filter((task) => task.status !== "done");
    const appointmentTasks = openTasks.filter((task) => task.category === "appointment" || task.category === "transport");
    const medicationTasks = openTasks.filter((task) => task.category === "medication");
    const adminTasks = openTasks.filter((task) => task.category === "admin" || task.category === "finance");
    const recentConcerns = [
      ...data.careSignals.filter((signal) => signal.severity !== "normal").map((signal) => signal.description),
      ...data.timeline.slice(0, 2).map((item) => item.description)
    ];
    const whoIsDoingWhat = data.members.map((member) => {
      const assigned = openTasks.filter((task) => task.assigneeId === member.id).length;
      return `${member.name}: ${assigned ? `${assigned} open item${assigned === 1 ? "" : "s"}` : "available for cover"}`;
    });

    return {
      rangeLabel: "Trust Bridge",
      currentSituation: data.recipient.context,
      upcomingAppointments: firstItems(
        appointmentTasks.map((task) => taskLabel(task, data.memberName)),
        "No appointment or transport tasks are currently open."
      ),
      activeTasks: firstItems(openTasks.map((task) => taskLabel(task, data.memberName)), "No active tasks are currently open."),
      medicationReminders: firstItems(
        medicationTasks.map((task) => taskLabel(task, data.memberName)),
        "No medication tasks are currently open."
      ),
      unresolvedAdmin: firstItems(
        adminTasks.map((task) => taskLabel(task, data.memberName)),
        "No admin or finance tasks are currently open."
      ),
      recentConcerns: firstItems(recentConcerns, "No recent alert-level concerns recorded."),
      whoIsDoingWhat,
      suggestedNextActions: [
        "Scan or paste the handover token with the incoming caregiver.",
        "Review medication, mobility, mood, and supplies together.",
        "Complete the handover to save a receipt to the timeline."
      ]
    };
  }, [data.careSignals, data.memberName, data.members, data.recipient.context, data.tasks, data.timeline]);

  function startHandover() {
    const now = new Date();
    const session: HandoverSession = {
      sessionId: makeId("handover"),
      careRecipientId: data.recipient.id,
      circleId: data.recipient.careCircleId,
      createdBy: leadCaregiverId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      scanToken: makeToken(data.recipient.careCircleId),
      checklistState: Object.fromEntries(checklistTemplate.map((item) => [item, false]))
    };

    setHandover(session);
    setScanToken("");
    setScanError("");
    data.addTimelineItem({
      type: "note",
      title: "Trust Bridge handover started",
      description: `${data.memberName(leadCaregiverId)} started a handover for ${data.recipient.name}.`,
      authorId: leadCaregiverId
    });
  }

  function claimHandover() {
    if (!activeHandover) return;
    const trimmedToken = scanToken.trim();

    if (!trimmedToken) {
      setScanError("Paste the scanned token to claim this handover.");
      return;
    }

    if (activeHandover.scanToken !== trimmedToken && !activeHandover.scanToken.includes(trimmedToken)) {
      setScanError("That token does not match the active handover.");
      return;
    }

    setHandover({
      ...activeHandover,
      scannedBy: incomingCaregiver?.id ?? leadCaregiverId
    });
    setScanError("");
  }

  function toggleChecklist(item: string) {
    if (!activeHandover) return;

    setHandover({
      ...activeHandover,
      checklistState: {
        ...activeHandover.checklistState,
        [item]: !activeHandover.checklistState[item]
      }
    });
  }

  function completeHandover() {
    if (!activeHandover || !allChecked) return;

    const savedHandover = data.addHandover(handoverPreview);
    const completedAt = new Date().toISOString();
    const receipt: HandoverReceipt = {
      reviewedSections,
      notes: receiptNotes,
      decisionRefs: careReferences,
      handoverId: savedHandover.id
    };

    setHandover({
      ...activeHandover,
      completedAt,
      receipt
    });
    data.addTimelineItem({
      type: "meeting summary",
      title: "Trust Bridge handover completed",
      description: receipt.notes,
      authorId: activeHandover.scannedBy ?? leadCaregiverId,
      linkedRecordId: savedHandover.id
    });
  }

  function resetHandover() {
    setHandover(null);
    setScanToken("");
    setScanError("");
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-24">
      <MobilePageHeader title="Handover" icon={Plane} />

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Trust Bridge handover</CardTitle>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Start the previous QR-and-checklist handover for {data.recipient.name}.
                </p>
              </div>
              <Badge variant={data.mockMode ? "warning" : "success"}>{data.mockMode ? "demo" : "live"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeHandover ? (
              <div className="space-y-4">
                <div className="rounded-3xl border bg-white/70 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <div className="font-bold">Ready to hand over care</div>
                      <p className="text-sm text-muted-foreground">Creates a one-hour token, QR code, checklist, and receipt.</p>
                    </div>
                  </div>
                </div>
                <Button onClick={startHandover} className="w-full">
                  <QrCode />
                  Start Trust Bridge handover
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border bg-white/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">Active handover</div>
                      <p className="text-sm text-muted-foreground">Expires {formatDateTime(activeHandover.expiresAt)}</p>
                    </div>
                    <Badge variant={activeHandover.scannedBy ? "success" : "secondary"}>
                      {activeHandover.scannedBy ? "claimed" : "waiting"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid place-items-center rounded-3xl bg-muted p-4">
                    <QRCodeSVG value={activeHandover.scanToken} size={196} level="M" includeMargin />
                  </div>

                  <div className="mt-4 rounded-2xl bg-muted px-3 py-2 font-mono text-xs break-all">
                    {activeHandover.scanToken}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => void navigator.clipboard?.writeText(activeHandover.scanToken)}
                  >
                    <Copy />
                    Copy token
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold" htmlFor="incoming-token">
                    Incoming caregiver token
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="incoming-token"
                      value={scanToken}
                      onChange={(event) => setScanToken(event.target.value)}
                      placeholder="Paste scanned token"
                    />
                    <Button type="button" variant="outline" onClick={claimHandover} aria-label="Claim handover">
                      <UserRoundCheck />
                    </Button>
                  </div>
                  {scanError ? <p className="text-sm font-medium text-destructive">{scanError}</p> : null}
                  {activeHandover.scannedBy ? (
                    <p className="text-sm text-muted-foreground">Claimed by {data.memberName(activeHandover.scannedBy)}.</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="font-bold">Checklist</div>
                  {Object.entries(activeHandover.checklistState).map(([item, checked]) => (
                    <label
                      key={item}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-white/70 p-3 text-sm font-semibold",
                        checked && "border-primary/40 bg-primary/10 text-primary"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleChecklist(item)}
                        className="size-4 accent-primary"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>

                <div className="rounded-3xl bg-muted p-4">
                  <div className="font-bold">Care references</div>
                  <div className="mt-3 space-y-2">
                    {careReferences.map((reference) => (
                      <div key={reference} className="rounded-2xl bg-white/75 p-3 text-sm leading-6">
                        {reference}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold" htmlFor="receipt-notes">
                    Receipt notes
                  </label>
                  <Textarea id="receipt-notes" value={receiptNotes} onChange={(event) => setReceiptNotes(event.target.value)} />
                </div>

                <Button onClick={completeHandover} disabled={!allChecked} className="w-full">
                  <Check />
                  Complete handover
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What gets handed over</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <HandoverSection title="Current situation" items={[handoverPreview.currentSituation]} />
            <HandoverSection title="Upcoming appointments" items={handoverPreview.upcomingAppointments} />
            <HandoverSection title="Medication and care reminders" items={handoverPreview.medicationReminders} />
            <HandoverSection title="Recent concerns" items={handoverPreview.recentConcerns} />
          </CardContent>
        </Card>

        {handover?.receipt ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Handover receipt</p>
                  <CardTitle>Last handover sent</CardTitle>
                </div>
                <Badge variant="success">
                  <ClipboardCheck className="size-3" />
                  saved
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                {handover.completedAt ? formatDateTime(handover.completedAt) : ""} · Reviewed{" "}
                {handover.receipt.reviewedSections.join(", ")}
              </p>
              <div className="rounded-3xl bg-muted p-4 text-sm leading-6">{handover.receipt.notes}</div>
              <Button type="button" variant="outline" onClick={resetHandover} className="w-full">
                Start another handover
              </Button>
            </CardContent>
          </Card>
        ) : null}
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
