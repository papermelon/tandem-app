"use client";

import Link from "next/link";
import { Database, FileText, KeyRound, RefreshCw, Settings, Shield, Sparkles } from "lucide-react";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { PageHeading } from "@/components/shared/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCareData } from "@/components/providers/care-data-provider";

export function SettingsView() {
  const { members, recipient, documents, mockMode, resetDemo } = useCareData();

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
    </div>
  );
}
