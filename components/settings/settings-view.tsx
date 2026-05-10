"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, Database, ExternalLink, FileText, Globe, KeyRound, MessageCircle, Plane, RefreshCw, Settings, Shield, Sparkles, User, Wand2 } from "lucide-react";

import { SignOutButton, useAuth } from "@/components/auth/auth-provider";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { CareProfileSummary } from "@/components/shared/care-profile-summary";
import { MobilePageHeader } from "@/components/dashboard/home/mobile-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCareData } from "@/components/providers/care-data-provider";
import { clearCareDemoData, setForceDemoData, shouldForceDemoData } from "@/lib/demo-mode";
import { createExistingDemoHomeState, createFreshHomeState, useHomeState, writeHomeStateSnapshot } from "@/lib/home-state";
import { categoryLabels } from "@/lib/labels";
import { SEA_LION_LANGUAGES, type LanguageCode } from "@/lib/languages";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
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
  const auth = useAuth();
  const home = useHomeState();
  const [editingName, setEditingName] = React.useState(false);
  const [draftName, setDraftName] = React.useState(home.state.caregiver.name);
  const [demoForced, setDemoForced] = React.useState(false);
  const [telegramLink, setTelegramLink] = React.useState<TelegramLinkState | null>(null);
  const [telegramStatus, setTelegramStatus] = React.useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = React.useState(false);
  const language = (home.state.caregiver.language ?? "en") as LanguageCode;

  React.useEffect(() => {
    setDraftName(home.state.caregiver.name);
  }, [home.state.caregiver.name]);

  React.useEffect(() => {
    setDemoForced(shouldForceDemoData());
  }, []);

  function handleShowDemoCircle() {
    setForceDemoData(true);
    clearCareDemoData();
    writeHomeStateSnapshot(createExistingDemoHomeState("Rachel"));
    resetDemo();
    setDemoForced(true);
    window.location.assign("/");
  }

  function handleReturnToLive() {
    setForceDemoData(false);
    clearCareDemoData();
    writeHomeStateSnapshot(createFreshHomeState(auth.profile?.name ?? "Caregiver"));
    setDemoForced(false);
    window.location.assign("/");
  }

  function handleResetEverything() {
    setForceDemoData(true);
    clearCareDemoData();
    resetDemo();
    writeHomeStateSnapshot(createExistingDemoHomeState("Rachel"));
    setDemoForced(true);
    window.location.assign("/");
  }

  async function handleCreateTelegramLink() {
    setTelegramLoading(true);
    setTelegramStatus(null);
    setTelegramLink(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("Sign in with Supabase before connecting Telegram.");
      }

      const response = await fetch("/api/telegram/link", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ careRecipientId: recipient.id })
      });
      const payload = (await response.json()) as TelegramLinkState & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not create Telegram link.");

      setTelegramLink(payload);
      setTelegramStatus(`Link expires at ${new Date(payload.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`);
    } catch (error) {
      setTelegramStatus(error instanceof Error ? error.message : "Could not create Telegram link.");
    } finally {
      setTelegramLoading(false);
    }
  }

  async function copyTelegramCommand() {
    if (!telegramLink?.startCommand) return;
    await navigator.clipboard.writeText(telegramLink.startCommand);
    setTelegramStatus("Start command copied.");
  }

  const isLiveMode = (auth.profile?.mode === "supabase" && !demoForced) || !mockMode;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-24">
      <MobilePageHeader title="Settings" icon={Settings} />

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              Your profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-white/70 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Name
              </div>
              {editingName ? (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    aria-label="Caregiver name"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      home.setCaregiverName(draftName.trim());
                      setEditingName(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="font-semibold">{home.state.caregiver.name || "Not set"}</div>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(true)}>
                    Edit
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-white/70 p-3">
              <label className="block">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Globe className="size-3.5" />
                  Language
                </span>
                <select
                  className="mt-2 block w-full rounded-xl border bg-white px-3 py-2 text-sm"
                  value={language}
                  onChange={(e) => home.setCaregiverLanguage(e.target.value as LanguageCode)}
                >
                  {SEA_LION_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} · {l.native}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                Choose the language you prefer for future family updates.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-white/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {auth.profile?.mode === "supabase" && demoForced
                      ? "Viewing Rachel's demo family"
                      : auth.profile?.mode === "supabase"
                        ? "Signed in"
                        : mockMode
                          ? "Demo mode"
                          : "Connected"}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {auth.profile?.mode === "supabase" && demoForced
                      ? "Your account is still signed in. Demo data stays on this browser."
                      : auth.profile?.mode === "supabase"
                      ? auth.profile.email ?? "Authenticated session is active."
                      : mockMode
                        ? "You are using sample family data on this browser."
                        : "Your shared care data is connected."}
                  </div>
                </div>
                <Badge variant={isLiveMode ? "success" : "warning"}>
                  {isLiveMode ? "Live" : "Demo"}
                </Badge>
              </div>
            </div>
            <SignOutButton className="w-full" />
            {auth.profile?.mode === "supabase" && demoForced ? (
              <div className="space-y-2">
                <Button onClick={handleReturnToLive} className="w-full">
                  Return to my family care space
                </Button>
                <p className="px-1 text-xs leading-5 text-muted-foreground">
                  Leaves the Rachel and Ah Muay demo and reloads the care spaces attached to your account.
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Button onClick={handleShowDemoCircle} variant="outline" className="w-full">
                <RefreshCw />
                View Rachel&apos;s demo family
              </Button>
              <p className="px-1 text-xs leading-5 text-muted-foreground">
                Switches this browser to Rachel and Ah Muay&apos;s sample family data. Your account data is not changed.
              </p>
            </div>
            <div className="space-y-2">
              <Button onClick={handleResetEverything} variant="outline" className="w-full">
                <RefreshCw />
                Reset demo data
              </Button>
              <p className="px-1 text-xs leading-5 text-muted-foreground">
                Clears demo tasks, timeline updates, and setup changes on this browser only.
              </p>
            </div>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/handover">
                <Plane className="size-4" />
                Handover / share care space
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-primary" />
              Telegram input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-white/70 p-3">
              <div className="font-semibold">{recipient.name}</div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Connect Telegram to this care space before forwarding care notes, images, or PDFs.
              </p>
            </div>
            <Button
              onClick={handleCreateTelegramLink}
              disabled={telegramLoading || !isLiveMode}
              className="w-full"
            >
              <MessageCircle className="size-4" />
              {telegramLoading ? "Creating link…" : "Connect Telegram"}
            </Button>
            {telegramLink ? (
              <div className="space-y-2 rounded-2xl border bg-white/70 p-3">
                {telegramLink.botUrl ? (
                  <Button asChild variant="soft" className="w-full">
                    <a href={telegramLink.botUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Open Telegram bot
                    </a>
                  </Button>
                ) : null}
                <div className="rounded-xl bg-muted/60 p-3 font-mono text-xs break-all">
                  {telegramLink.startCommand}
                </div>
                <Button variant="outline" size="sm" onClick={copyTelegramCommand} className="w-full">
                  <Copy className="size-4" />
                  Copy start command
                </Button>
              </div>
            ) : null}
            {telegramStatus ? <p className="px-1 text-xs leading-5 text-muted-foreground">{telegramStatus}</p> : null}
            {!isLiveMode ? (
              <p className="px-1 text-xs leading-5 text-muted-foreground">
                Telegram linking is available for live Supabase care spaces.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              Loved one
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl bg-primary/5 p-4">
              <div className="text-2xl font-bold">{recipient.name}, {recipient.age}</div>
              <div className="mt-1 text-sm leading-6 text-muted-foreground">{recipient.context}</div>
              <div className="mt-3 rounded-xl bg-white/75 px-3 py-2 text-sm font-semibold">{recipient.address}</div>
              <CareProfileSummary profile={recipient.careProfile} compact className="mt-4" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Family and helpers</CardTitle>
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
          <CardTitle>Records and tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-white/70 p-3">
              <div className="flex items-center gap-2 font-semibold">
                <Database className="size-4 text-primary" />
                {documents.length} document records
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Doctor memos, HDB EASE letters, AIC grant notes, and bills wait for review before saving.</p>
            </div>
            <div className="grid gap-2">
              <Button asChild variant="soft">
                <Link href="/handover">Prepare handover</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/meeting">Summarize family meeting</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/capture"><FileText /> Add paperwork</Link>
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
              Task matching preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              Tandem suggests who might be best placed to help based on task type, current load, and these preferences. A family member still checks before anything is saved.
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

type TelegramLinkState = {
  token: string;
  expiresAt: string;
  botUsername: string | null;
  botUrl: string | null;
  startCommand: string;
  recipientName?: string;
};

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
