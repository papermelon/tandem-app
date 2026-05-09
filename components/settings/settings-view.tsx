"use client";

import * as React from "react";
import Link from "next/link";
import { Database, FileText, KeyRound, RefreshCw, Settings, Shield, Sparkles, Wand2 } from "lucide-react";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { PageHeading } from "@/components/shared/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCareData } from "@/components/providers/care-data-provider";
import { categoryLabels } from "@/lib/labels";
import type { FamilyMember, TaskCategory } from "@/lib/types";

const ROUTING_CATEGORIES: TaskCategory[] = [
  "appointment",
  "transport",
  "medication",
  "admin",
  "finance",
  "check-in",
  "home safety"
];

export function SettingsView() {
  const { members, recipient, documents, mockMode, resetDemo, updateMemberPreferences } = useCareData();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        eyebrow="Settings"
        title="Demo family circle"
        description="Supabase Auth is ready to connect; without keys, Tandem keeps using local seeded data."
        icon={Settings}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              App mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-white/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{mockMode ? "Local mock mode" : "Supabase connected"}</div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {mockMode
                      ? "No backend keys are required for the hackathon demo."
                      : "Data can be loaded from Supabase tables and Storage."}
                  </div>
                </div>
                <Badge variant={mockMode ? "warning" : "success"}>{mockMode ? "Mock" : "Live"}</Badge>
              </div>
            </div>
            <Button onClick={resetDemo} variant="outline" className="w-full">
              <RefreshCw />
              Reset seeded demo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              Care recipient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl bg-primary/5 p-4">
              <div className="text-2xl font-bold">{recipient.name}, {recipient.age}</div>
              <div className="mt-1 text-sm leading-6 text-muted-foreground">{recipient.context}</div>
              <div className="mt-3 rounded-xl bg-white/75 px-3 py-2 text-sm font-semibold">{recipient.address}</div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Family members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex flex-col gap-3 rounded-2xl border bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <MemberAvatar avatar={member.avatar} name={member.name} />
                  <div>
                    <div className="font-semibold">{member.name}</div>
                    <div className="text-xs text-muted-foreground">{member.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.isDefaultCaregiver ? <Badge variant="secondary">Default</Badge> : <Badge variant="outline">Can help</Badge>}
                  <Button asChild variant="soft" size="sm">
                    <Link href={`/wrapped/${member.id}`} aria-label={`View ${member.name}'s Caregiver Wrapped`}>
                      <Sparkles className="size-3.5" />
                      Wrapped
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Records and next views</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-white/70 p-3">
              <div className="flex items-center gap-2 font-semibold">
                <Database className="size-4 text-primary" />
                {documents.length} document records
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Doctor memos, HDB EASE letters, AIC grant notes, and bills can be reviewed before saving.</p>
            </div>
            <div className="grid gap-2">
              <Button asChild variant="soft">
                <Link href="/handover">Generate handover</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/meeting">Family meeting assistant</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/capture"><FileText /> Image-to-record capture</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="size-5 text-primary" />
              Smart Assign preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              Tandem proposes assignees based on category history, current load, and the preferences set here. Lead caregiver still approves before anything is dispatched.
            </p>
            {members.map((member) => (
              <RoutingPreferenceRow
                key={member.id}
                member={member}
                onSave={(patch) => updateMemberPreferences(member.id, patch)}
              />
            ))}
          </CardContent>
        </Card>
        <RoutingTelemetryCard />
      </section>
    </div>
  );
}

type RoutingTelemetry = {
  total: number;
  resolved: number;
  autoExecuted: number;
  acceptanceRate: number | null;
  reassignmentRate: number | null;
  medianTimeToClaimMinutes: number | null;
};

function RoutingTelemetryCard() {
  const [telemetry, setTelemetry] = React.useState<RoutingTelemetry | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/routing/telemetry", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { telemetry?: RoutingTelemetry }) => {
        if (!cancelled) setTelemetry(payload.telemetry ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Routing telemetry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : !telemetry || telemetry.total === 0 ? (
          <div className="text-muted-foreground">No routing decisions yet.</div>
        ) : (
          <>
            <Metric label="Decisions" value={String(telemetry.total)} />
            <Metric
              label="Acceptance"
              value={formatPercent(telemetry.acceptanceRate)}
              hint="≥60% target"
              tone={
                telemetry.acceptanceRate !== null && telemetry.acceptanceRate >= 0.6
                  ? "good"
                  : telemetry.acceptanceRate !== null
                    ? "warn"
                    : undefined
              }
            />
            <Metric label="Reassigned <4h" value={formatPercent(telemetry.reassignmentRate)} />
            <Metric
              label="Median time to claim"
              value={telemetry.medianTimeToClaimMinutes !== null ? `${Math.round(telemetry.medianTimeToClaimMinutes)} min` : "—"}
            />
            <Metric label="Auto-executed" value={String(telemetry.autoExecuted)} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "warn" }) {
  const toneClass = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
      <div className="text-xs text-muted-foreground">
        {label}
        {hint ? <span className="ml-1 text-[10px]">({hint})</span> : null}
      </div>
      <div className={`text-sm font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

function RoutingPreferenceRow({
  member,
  onSave
}: {
  member: FamilyMember;
  onSave: (patch: { categoryPreferences?: TaskCategory[]; loadCapacityPct?: number }) => void;
}) {
  const [prefs, setPrefs] = React.useState<TaskCategory[]>(member.categoryPreferences ?? []);
  const [capacity, setCapacity] = React.useState<number>(member.loadCapacityPct ?? 100);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    setPrefs(member.categoryPreferences ?? []);
    setCapacity(member.loadCapacityPct ?? 100);
  }, [member.categoryPreferences, member.loadCapacityPct]);

  function toggle(category: TaskCategory) {
    setPrefs((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category]
    );
  }

  function save() {
    onSave({ categoryPreferences: prefs, loadCapacityPct: capacity });
    setSavedAt(Date.now());
  }

  const dirty =
    capacity !== (member.loadCapacityPct ?? 100) ||
    prefs.length !== (member.categoryPreferences ?? []).length ||
    prefs.some((c) => !(member.categoryPreferences ?? []).includes(c));

  return (
    <div className="rounded-2xl border bg-white/70 p-3">
      <div className="flex items-center gap-3">
        <MemberAvatar avatar={member.avatar} name={member.name} />
        <div className="flex-1">
          <div className="font-semibold">{member.name}</div>
          <div className="text-xs text-muted-foreground">{member.role}</div>
        </div>
        {member.isDefaultCaregiver ? <Badge variant="secondary">Default</Badge> : null}
      </div>

      <div className="mt-3">
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Owns these categories</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROUTING_CATEGORIES.map((category) => {
            const active = prefs.includes(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggle(category)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-white text-foreground"
                }`}
              >
                {categoryLabels[category]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <span>Load capacity</span>
          <span className="text-foreground">{capacity}%</span>
        </div>
        <input
          type="range"
          min={50}
          max={200}
          step={10}
          value={capacity}
          onChange={(event) => setCapacity(Number(event.target.value))}
          aria-label={`${member.name} load capacity`}
          className="mt-2 w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>50%</span>
          <span>100%</span>
          <span>200%</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {savedAt && !dirty ? <span className="text-xs text-muted-foreground">Saved</span> : null}
        <Button size="sm" onClick={save} disabled={!dirty}>
          Save preferences
        </Button>
      </div>
    </div>
  );
}
