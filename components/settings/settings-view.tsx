"use client";

import * as React from "react";
import Link from "next/link";
import { Database, FileText, Globe, KeyRound, Plane, RefreshCw, Settings, Shield, Sparkles, User } from "lucide-react";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { MobilePageHeader } from "@/components/dashboard/home/mobile-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCareData } from "@/components/providers/care-data-provider";
import { useHomeState } from "@/lib/home-state";
import { SEA_LION_LANGUAGES, type LanguageCode } from "@/lib/languages";

const HOME_STORAGE_KEY = "tandem-home-state-v1";

export function SettingsView() {
  const { members, recipient, documents, mockMode, resetDemo } = useCareData();
  const home = useHomeState();
  const [editingName, setEditingName] = React.useState(false);
  const [draftName, setDraftName] = React.useState(home.state.caregiver.name);

  React.useEffect(() => {
    setDraftName(home.state.caregiver.name);
  }, [home.state.caregiver.name]);

  const language = (home.state.caregiver.language ?? "en") as LanguageCode;

  const handleResetHome = () => {
    if (typeof window === "undefined") return;
    if (!window.confirm("Clear caregiver name, patients, and selection? This cannot be undone.")) return;
    window.localStorage.removeItem(HOME_STORAGE_KEY);
    window.location.reload();
  };

  const handleResetEverything = () => {
    if (typeof window === "undefined") return;
    if (!window.confirm("Reset all demo data including tasks, timeline, and home state?")) return;
    window.localStorage.removeItem(HOME_STORAGE_KEY);
    resetDemo();
  };

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
            <Button onClick={handleResetHome} variant="outline" className="w-full">
              <RefreshCw />
              Reset home state only
            </Button>
            <Button onClick={handleResetEverything} variant="outline" className="w-full">
              <RefreshCw />
              Reset all demo data
            </Button>
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

      <section className="mt-4 space-y-4">
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
    </div>
  );
}
