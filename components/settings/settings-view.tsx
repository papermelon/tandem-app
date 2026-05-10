"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Globe,
  KeyRound,
  Mail,
  MessageCircle,
  Plane,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  User,
  Wand2
} from "lucide-react";

import { SignOutButton, useAuth } from "@/components/auth/auth-provider";
import { MobilePageHeader } from "@/components/dashboard/home/mobile-page-header";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { CareProfileSummary } from "@/components/shared/care-profile-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useCareData } from "@/components/providers/care-data-provider";
import { summarizeMemberLoad } from "@/lib/care-load";
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
  const { members, recipient, documents, loadCategories, mockMode, resetDemo, updateMemberPreferences } = useCareData();
  const auth = useAuth();
  const home = useHomeState();
  const [editingName, setEditingName] = React.useState(false);
  const [draftName, setDraftName] = React.useState(home.state.caregiver.name);
  const [demoForced, setDemoForced] = React.useState(false);
  const language = (home.state.caregiver.language ?? "en") as LanguageCode;

  React.useEffect(() => {
    setDraftName(home.state.caregiver.name);
  }, [home.state.caregiver.name]);

  React.useEffect(() => {
    setDemoForced(shouldForceDemoData());
  }, []);

  function activeCaregiverName() {
    return auth.profile?.name || home.state.caregiver.name || "Caregiver";
  }

  function handleShowDemoCircle() {
    const name = activeCaregiverName();
    setForceDemoData(true);
    clearCareDemoData();
    writeHomeStateSnapshot(createExistingDemoHomeState(name));
    resetDemo(name);
    setDemoForced(true);
    window.location.assign("/");
  }

  function handleReturnToLive() {
    setForceDemoData(false);
    clearCareDemoData();
    writeHomeStateSnapshot(createFreshHomeState(activeCaregiverName()));
    setDemoForced(false);
    window.location.assign("/");
  }

  function handleResetEverything() {
    const name = activeCaregiverName();
    setForceDemoData(true);
    clearCareDemoData();
    resetDemo(name);
    writeHomeStateSnapshot(createExistingDemoHomeState(name));
    setDemoForced(true);
    window.location.assign("/");
  }

  const isLiveMode = auth.profile?.mode === "supabase" && !mockMode && !demoForced;
  const memberLoads = summarizeMemberLoad(members, loadCategories);
  const loadByMemberId = new Map(memberLoads.map((member) => [member.id, member]));

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-24">
      <MobilePageHeader title="Settings" icon={Settings} />

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              Caregiver
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
                      const nextName = draftName.trim();
                      home.setCaregiverName(nextName);
                      resetDemo(nextName);
                      setEditingName(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="font-semibold">{home.state.caregiver.name || auth.profile?.name || "Not set"}</div>
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
                SEA-LION-aligned language list. UI translation is wired in a follow-up.
              </p>
            </div>
          </CardContent>
        </Card>

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
                  <div className="font-semibold">
                    {auth.profile?.mode === "supabase" && demoForced
                      ? "Viewing demo"
                      : auth.profile?.mode === "supabase" && !mockMode
                        ? "Signed in with Supabase"
                        : auth.profile?.mode === "supabase"
                          ? "Signed in, viewing demo"
                        : mockMode
                          ? "Local demo mode"
                          : "Supabase connected"}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {auth.profile?.mode === "supabase" && demoForced
                      ? "Your live account is still signed in. Demo data is local to this browser."
                      : auth.profile?.mode === "supabase" && !mockMode
                        ? auth.profile.email ?? "Authenticated session is active."
                        : auth.profile?.mode === "supabase"
                          ? "No live care circle is attached yet, so Tandem is keeping you in the local demo."
                        : mockMode
                          ? "No backend keys are required for the local demo."
                          : "Data can be loaded from Supabase tables and Storage."}
                  </div>
                </div>
                <Badge variant={isLiveMode ? "success" : "warning"}>
                  {isLiveMode ? "Live" : "Demo"}
                </Badge>
              </div>
            </div>
            {auth.profile?.mode === "supabase" ? <SignOutButton className="w-full" /> : <MagicLinkSignIn />}
            {auth.profile?.mode === "supabase" && demoForced ? (
              <div className="space-y-2">
                <Button onClick={handleReturnToLive} className="w-full">
                  Return to my live care circle
                </Button>
                <p className="px-1 text-xs leading-5 text-muted-foreground">
                  Leaves the demo and reloads only the care circles attached to your Supabase account.
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Button onClick={handleShowDemoCircle} variant="outline" className="w-full">
                <RefreshCw />
                View demo circle
              </Button>
              <p className="px-1 text-xs leading-5 text-muted-foreground">
                Intentionally switches this browser to the local Ah Muay demo. Supabase data is not changed.
              </p>
            </div>
            <div className="space-y-2">
              <Button onClick={handleResetEverything} variant="outline" className="w-full">
                <RefreshCw />
                Reset local demo records
              </Button>
              <p className="px-1 text-xs leading-5 text-muted-foreground">
                Clears local task, timeline, home, and title-screen changes in this browser only.
              </p>
            </div>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/handover">
                <Plane className="size-4" />
                Handover / share circle
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-primary" />
              Telegram sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TelegramConnectCard
              careRecipientId={recipient.id}
              isLiveMode={isLiveMode}
              recipientName={recipient.name}
            />
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
              <CareProfileSummary profile={recipient.careProfile} phone={recipient.phone} compact className="mt-4" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Family members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-2xl border bg-white/70 p-3">
                <div className="grid grid-cols-[auto_1fr] gap-3">
                  <MemberAvatar avatar={member.avatar} name={member.name} />
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <div className="truncate font-semibold">{member.name}</div>
                      {member.isDefaultCaregiver ? (
                        <Badge variant="secondary" className="shrink-0 px-2 py-0.5 text-[11px]">
                          Default
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {member.phone ? `${member.role} · ${member.phone}` : member.role}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {!member.isDefaultCaregiver ? (
                        <Badge variant="outline" className="shrink-0 px-2 py-0.5 text-[11px]">
                          Can help
                        </Badge>
                      ) : null}
                      <Button asChild variant="soft" size="sm" className="h-8 rounded-full px-3 text-xs">
                        <Link href={`/wrapped/${member.id}`} aria-label={`View ${member.name}'s Caregiver Wrapped`}>
                          <Sparkles className="size-3.5" />
                          Wrapped
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <InviteFamilyMemberForm disabled={auth.profile?.mode !== "supabase"} />
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

      <section className="mt-4">
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
                loadCount={loadByMemberId.get(member.id)?.count ?? 0}
                loadSharePct={loadByMemberId.get(member.id)?.sharePct ?? 0}
                onSave={(patch) => updateMemberPreferences(member.id, patch)}
              />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MagicLinkSignIn() {
  const auth = useAuth();
  const home = useHomeState();
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage(await auth.signInWithEmail({ email, name: home.state.caregiver.name || "Caregiver" }));
    setSending(false);
  }

  return (
    <form className="space-y-2 rounded-2xl border bg-white/70 p-3" onSubmit={submit}>
      <div className="flex items-center gap-2 text-sm font-bold">
        <Mail className="size-4 text-primary" />
        Optional login
      </div>
      <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
      <Button type="submit" variant="outline" className="w-full" disabled={!email.trim() || sending}>
        {sending ? "Sending" : "Email me a Supabase magic link"}
      </Button>
      {message ? <p className="text-xs leading-5 text-muted-foreground">{message}</p> : null}
    </form>
  );
}

function InviteFamilyMemberForm({ disabled }: { disabled: boolean }) {
  const auth = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage(await auth.inviteWithEmail({ email, name }));
    setSending(false);
  }

  return (
    <form className="space-y-2 rounded-2xl border bg-primary/5 p-3" onSubmit={submit}>
      <div className="flex items-center gap-2 text-sm font-bold">
        <Mail className="size-4 text-primary" />
        Add family member
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Sends a Supabase magic link by email. Handover QR remains separate.
      </p>
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" disabled={disabled} />
      <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="family@example.com" disabled={disabled} />
      <Button type="submit" className="w-full" disabled={disabled || !email.trim() || sending}>
        {disabled ? "Sign in to invite" : sending ? "Sending" : "Send magic link"}
      </Button>
      {message ? <p className="text-xs leading-5 text-muted-foreground">{message}</p> : null}
    </form>
  );
}

type TelegramLinkPayload = {
  token?: string;
  expiresAt?: string;
  botUsername?: string | null;
  botUrl?: string | null;
  startCommand?: string;
  recipientName?: string;
  error?: string;
};

function TelegramConnectCard({
  careRecipientId,
  isLiveMode,
  recipientName
}: {
  careRecipientId: string;
  isLiveMode: boolean;
  recipientName: string;
}) {
  const [link, setLink] = React.useState<TelegramLinkPayload | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function createLink() {
    setLoading(true);
    setMessage(null);
    setCopied(false);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const token = data.session?.access_token;

      if (!token) {
        setMessage("Sign in to Live Supabase before connecting Telegram.");
        setLink(null);
        return;
      }

      const response = await fetch("/api/telegram/link", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ careRecipientId })
      });
      const payload = (await response.json().catch(() => ({}))) as TelegramLinkPayload;

      if (!response.ok) {
        setMessage(payload.error ?? "Could not create a Telegram link.");
        setLink(null);
        return;
      }

      setLink(payload);
    } catch {
      setMessage("Could not create a Telegram link.");
      setLink(null);
    } finally {
      setLoading(false);
    }
  }

  async function copyCommand() {
    if (!link?.startCommand) return;
    try {
      await navigator.clipboard.writeText(link.startCommand);
      setCopied(true);
    } catch {
      setMessage("Could not copy the command.");
    }
  }

  return (
    <div className={`rounded-2xl border p-3 ${isLiveMode ? "bg-white/70" : "bg-muted/40"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">Telegram capture</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {isLiveMode
              ? `Link forwarded care notes to ${recipientName}'s live care space.`
              : "Available after signing in to the Live Supabase care space."}
          </p>
        </div>
        <Badge variant={isLiveMode ? "success" : "warning"} className="shrink-0">
          {isLiveMode ? "Live" : "Live only"}
        </Badge>
      </div>

      <Button
        className="mt-3 w-full"
        variant={isLiveMode ? "default" : "outline"}
        onClick={createLink}
        disabled={!isLiveMode || loading}
      >
        <MessageCircle className="size-4" />
        {loading ? "Creating link" : "Connect Telegram"}
      </Button>

      {link?.startCommand ? (
        <div className="mt-3 rounded-xl border bg-white/80 p-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-primary" />
            Link ready
          </div>
          {link.botUrl ? (
            <Button asChild variant="soft" size="sm" className="mt-2 w-full">
              <a href={link.botUrl} target="_blank" rel="noreferrer">
                Open Telegram
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-2 py-2 text-xs">
              {link.startCommand}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={copyCommand}
              aria-label="Copy Telegram start command"
            >
              {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            This token expires in 15 minutes and links only this Telegram sender.
          </p>
        </div>
      ) : null}

      {message ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function RoutingPreferenceRow({
  member,
  loadCount,
  loadSharePct,
  onSave
}: {
  member: FamilyMember;
  loadCount: number;
  loadSharePct: number;
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
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-5 transition ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-white text-foreground"
                }`}
              >
                {categoryLabels[category]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-muted/40 p-3">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <span>Care load this week</span>
            <span className="shrink-0 text-foreground">{loadSharePct}%</span>
          </div>
          <ProgressBar value={loadSharePct} className="h-1.5" />
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {loadCount} visible care {loadCount === 1 ? "action" : "actions"} from tasks, records, and updates.
          </p>
        </div>

        <div className="mt-3 border-t pt-3">
          <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <span>Available capacity</span>
            <span className="shrink-0 text-foreground">{capacity}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={capacity}
            onChange={(event) => setCapacity(Number(event.target.value))}
            aria-label={`${member.name} available capacity`}
            className="mt-2 w-full accent-primary"
          />
          <div className="grid grid-cols-3 text-[10px] text-muted-foreground">
            <span>50%</span>
            <span className="text-center">100%</span>
            <span className="text-right">200%</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Used by Smart Assign when balancing new tasks.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{savedAt && !dirty ? "Saved" : dirty ? "Unsaved changes" : "Up to date"}</span>
        <Button size="sm" onClick={save} disabled={!dirty} className="h-8 rounded-full px-4 text-xs">
          Save
        </Button>
      </div>
    </div>
  );
}
