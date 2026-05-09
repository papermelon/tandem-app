"use client";

import * as React from "react";
import Image from "next/image";
import { Check, ChevronDown, ChevronUp, ExternalLink, FileText, ImageIcon, Inbox, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import { PageHeading } from "@/components/shared/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCareData } from "@/components/providers/care-data-provider";
import { categoryLabels } from "@/lib/labels";
import { rankAssignees } from "@/lib/routing";
import type { CaptureEvent, ExtractedItem, FamilyMember, RoutingCandidate, Task, TaskCategory, TaskPriority } from "@/lib/types";

type CapturesPayload = {
  captures: CaptureEvent[];
  error?: string;
};

const categories: TaskCategory[] = ["appointment", "transport", "medication", "admin", "finance", "check-in", "home safety"];
const priorities: TaskPriority[] = ["low", "medium", "high"];

export function InboxView() {
  const { members, tasks } = useCareData();
  const [captures, setCaptures] = React.useState<CaptureEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const loadCaptures = React.useCallback(async () => {
    try {
      const response = await fetch("/api/captures?status=pending_review", { cache: "no-store" });
      const payload = (await response.json()) as CapturesPayload;
      setCaptures(payload.captures ?? []);
      setError(payload.error ?? null);
    } catch {
      setError("Could not load the review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCaptures();
    const interval = window.setInterval(() => void loadCaptures(), 5000);
    return () => window.clearInterval(interval);
  }, [loadCaptures]);

  async function approveCapture(captureId: string) {
    setBusyId(captureId);
    try {
      await fetch(`/api/captures/${captureId}/approve`, { method: "POST" });
      setCaptures((current) => current.filter((capture) => capture.id !== captureId));
    } finally {
      setBusyId(null);
    }
  }

  async function ignoreCapture(captureId: string) {
    setBusyId(captureId);
    try {
      await fetch(`/api/captures/${captureId}/ignore`, { method: "POST" });
      setCaptures((current) => current.filter((capture) => capture.id !== captureId));
    } finally {
      setBusyId(null);
    }
  }

  function updateItem(captureId: string, item: ExtractedItem) {
    setCaptures((current) =>
      current.map((capture) =>
        capture.id === captureId
          ? {
              ...capture,
              items: capture.items.map((entry) => (entry.id === item.id ? item : entry))
            }
          : capture
      )
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeading
        eyebrow="Inbox"
        title="Review forwarded care items"
        description="Forward images, screenshots, PDFs, or messages to the Tandem Telegram bot. Nothing becomes family memory until it is reviewed here."
        icon={Inbox}
        badge="Pending review first"
      />

      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border bg-white/70 p-3">
        <div className="text-sm leading-6 text-muted-foreground">
          Queue refreshes automatically. Use Save All only after checking the extracted tasks and notes.
        </div>
        <Button variant="outline" size="sm" onClick={loadCaptures} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 text-sm leading-6 text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border bg-white/70">
          <div className="text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
            <div className="mt-3 text-sm font-semibold">Loading forwarded items</div>
          </div>
        </div>
      ) : captures.length === 0 ? (
        <Card>
          <CardContent className="grid min-h-72 place-items-center pt-4 text-center">
            <div>
              <Inbox className="mx-auto size-9 text-primary" />
              <h2 className="mt-3 text-xl font-bold">No pending forwarded items</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Forward a doctor memo image or appointment screenshot to the Tandem Telegram bot. Extracted details will appear here for review.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {captures.map((capture) => (
            <CaptureCard
              key={capture.id}
              capture={capture}
              members={members}
              tasks={tasks}
              busy={busyId === capture.id}
              onApprove={() => void approveCapture(capture.id)}
              onIgnore={() => void ignoreCapture(capture.id)}
              onUpdateItem={(item) => updateItem(capture.id, item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CaptureCard({
  capture,
  members,
  tasks,
  busy,
  onApprove,
  onIgnore,
  onUpdateItem
}: {
  capture: CaptureEvent;
  members: FamilyMember[];
  tasks: Task[];
  busy: boolean;
  onApprove: () => void;
  onIgnore: () => void;
  onUpdateItem: (item: ExtractedItem) => void;
}) {
  const pendingItems = capture.items.filter((item) => item.status === "pending");

  return (
    <Card id={capture.id} className="overflow-hidden">
      <CardHeader className="border-b bg-white/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>{capture.platform}</Badge>
              <Badge variant="secondary">{capture.sourceType}</Badge>
              <Badge variant="warning">{pendingItems.length} pending</Badge>
            </div>
            <CardTitle className="mt-3">{capture.extractionJson?.document_type || capture.originalFileName || "Forwarded care item"}</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              {capture.senderName || "Family"} · {new Date(capture.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onIgnore} disabled={busy}>
              <Trash2 />
              Ignore
            </Button>
            <Button onClick={onApprove} disabled={busy || pendingItems.length === 0}>
              {busy ? <Loader2 className="animate-spin" /> : <Check />}
              Save All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 lg:grid-cols-[0.85fr_1.15fr]">
        <SourcePreview capture={capture} />
        <div className="space-y-4">
          <div className="rounded-2xl bg-primary/5 p-4">
            <div className="text-xs font-bold uppercase text-primary">AI summary</div>
            <p className="mt-2 text-sm leading-6">{capture.aiSummary || "No summary was generated."}</p>
          </div>

          <div className="space-y-3">
            {pendingItems.map((item) => (
              <EditableExtractedItem key={item.id} item={item} members={members} tasks={tasks} onUpdate={onUpdateItem} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SourcePreview({ capture }: { capture: CaptureEvent }) {
  if (capture.originalFileUrl && capture.originalFileMimeType?.startsWith("image/")) {
    return (
      <div className="rounded-2xl border bg-white/70 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold">
          <ImageIcon className="size-4 text-primary" />
          Original image
        </div>
        <Image
          src={capture.originalFileUrl}
          alt="Forwarded care document"
          width={900}
          height={1200}
          unoptimized
          className="max-h-[30rem] w-full rounded-xl object-contain"
        />
      </div>
    );
  }

  if (capture.originalFileUrl) {
    return (
      <div className="rounded-2xl border bg-white/70 p-4">
        <div className="flex items-center gap-2 font-bold">
          <FileText className="size-5 text-primary" />
          Original document
        </div>
        <a
          href={capture.originalFileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          Open file <ExternalLink className="size-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white/70 p-4">
      <div className="text-sm font-bold">Forwarded text</div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{capture.rawText || "No source text available."}</p>
    </div>
  );
}

function EditableExtractedItem({
  item,
  members,
  tasks,
  onUpdate
}: {
  item: ExtractedItem;
  members: FamilyMember[];
  tasks: Task[];
  onUpdate: (item: ExtractedItem) => void;
}) {
  const [draft, setDraft] = React.useState(item);
  const [saving, setSaving] = React.useState(false);

  const candidates = React.useMemo(
    () =>
      rankAssignees(
        { category: draft.category, dueAt: draft.dueAt, priority: draft.priority },
        { members, tasks }
      ),
    [draft.category, draft.dueAt, draft.priority, members, tasks]
  );

  async function savePatch(nextDraft = draft) {
    setSaving(true);
    try {
      await fetch(`/api/extracted-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patch: {
            title: nextDraft.title,
            summary: nextDraft.summary,
            assignedToId: nextDraft.assignedToId ?? null,
            dueAt: nextDraft.dueAt ?? null,
            priority: nextDraft.priority,
            category: nextDraft.category,
            status: nextDraft.status
          }
        })
      });
      onUpdate(nextDraft);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    const nextDraft = { ...draft, status: "deleted" as const };
    setDraft(nextDraft);
    await savePatch(nextDraft);
  }

  return (
    <div className="rounded-2xl border bg-white/70 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Badge variant={item.type === "appointment" ? "success" : item.type === "medication" ? "warning" : "default"}>{item.type}</Badge>
          {draft.category ? <Badge variant="outline">{categoryLabels[draft.category]}</Badge> : null}
        </div>
        <Button variant="ghost" size="sm" onClick={deleteItem} disabled={saving}>
          <Trash2 />
          Delete
        </Button>
      </div>

      <SmartAssignPanel
        candidates={candidates}
        members={members}
        currentAssigneeId={draft.assignedToId}
        onPick={(memberId) => {
          const next = { ...draft, assignedToId: memberId };
          setDraft(next);
          void savePatch(next);
        }}
      />

      <div className="mt-3 grid gap-3">
        <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} aria-label="Item title" />
        <Textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} aria-label="Item summary" />

        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={draft.assignedToId ?? ""}
            onChange={(event) => setDraft({ ...draft, assignedToId: event.target.value || undefined })}
            aria-label="Assignee"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>

          <Input
            type="datetime-local"
            value={draft.dueAt ? draft.dueAt.slice(0, 16) : ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                dueAt: event.target.value ? new Date(event.target.value).toISOString() : undefined
              })
            }
            aria-label="Due date"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={draft.category ?? ""}
            onChange={(event) => setDraft({ ...draft, category: (event.target.value || undefined) as TaskCategory | undefined })}
            aria-label="Category"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </Select>

          <Select
            value={draft.priority ?? ""}
            onChange={(event) => setDraft({ ...draft, priority: (event.target.value || undefined) as TaskPriority | undefined })}
            aria-label="Priority"
          >
            <option value="">No priority</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </Select>
        </div>

        <Button variant="outline" onClick={() => void savePatch()} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Check />}
          Save edits
        </Button>
      </div>
    </div>
  );
}

function SmartAssignPanel({
  candidates,
  members,
  currentAssigneeId,
  onPick
}: {
  candidates: RoutingCandidate[];
  members: FamilyMember[];
  currentAssigneeId?: string;
  onPick: (memberId: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  if (candidates.length === 0) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Sparkles className="size-3.5" />
        No confident match — leave unclaimed and pick manually below.
      </div>
    );
  }

  const memberById = new Map(members.map((m) => [m.id, m]));
  const top = candidates[0]!;
  const topMember = memberById.get(top.memberId);
  const rest = candidates.slice(1);
  const isAlreadyAssigned = currentAssigneeId === top.memberId;

  return (
    <div className="mb-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
        <Sparkles className="size-3.5" />
        Smart suggestion
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <MemberAvatar member={topMember} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{topMember?.name ?? "Unknown"}</div>
          <LoadBar pct={top.loadPct} />
        </div>
        <Button size="sm" onClick={() => onPick(top.memberId)} disabled={isAlreadyAssigned}>
          <Check />
          {isAlreadyAssigned ? "Assigned" : "Approve & assign"}
        </Button>
      </div>

      {top.reasons.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-xs leading-5 text-muted-foreground">
          {top.reasons.map((reason) => (
            <li key={reason} className="before:mr-1.5 before:content-['•']">{reason}</li>
          ))}
        </ul>
      ) : null}

      {rest.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {expanded ? "Hide other options" : `Pick someone else (${rest.length})`}
          </button>

          {expanded ? (
            <div className="mt-2 space-y-2 border-t border-primary/10 pt-2">
              {rest.map((candidate) => {
                const member = memberById.get(candidate.memberId);
                return (
                  <div key={candidate.memberId} className="flex items-center gap-3">
                    <MemberAvatar member={member} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{member?.name ?? "Unknown"}</div>
                      <LoadBar pct={candidate.loadPct} />
                      {candidate.reasons[0] ? (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{candidate.reasons[0]}</div>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPick(candidate.memberId)}
                      disabled={currentAssigneeId === candidate.memberId}
                    >
                      Assign
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function MemberAvatar({ member }: { member?: FamilyMember }) {
  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
      {member?.avatar ?? "?"}
    </div>
  );
}

function LoadBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const tone = clamped >= 80 ? "bg-destructive" : clamped >= 50 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{clamped}% load</span>
    </div>
  );
}
