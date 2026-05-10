"use client";

import * as React from "react";
import { Plane, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCareData } from "@/components/providers/care-data-provider";
import { buildHandoverDraft } from "@/lib/handover-utils";
import type { HandoverSession } from "@/lib/types";
import { HandoverQrDisplay } from "./handover-qr-display";

const EXPIRY_MS = 60 * 60 * 1000;

export function GenerateHandoverQR() {
  const data = useCareData();
  const departingCaregiverId =
    data.members.find((member) => member.isDefaultCaregiver)?.id ?? data.members[0]?.id ?? "rachel";
  const activeSession = (data.handoverSessions ?? []).find(
    (session) =>
      !session.archivedAt &&
      (session.status === "pending" ||
        session.status === "in-progress" ||
        session.status === "completed")
  );

  const [generating, setGenerating] = React.useState(false);

  function generate() {
    if (generating) return;
    setGenerating(true);
    try {
      const draft = buildHandoverDraft(data, departingCaregiverId);
      const now = new Date();
      const session: Omit<HandoverSession, "id" | "createdAt"> = {
        circleId: data.recipient.careCircleId,
        careRecipientId: data.recipient.id,
        departingCaregiverId,
        briefing: draft.briefing,
        careHistory: draft.careHistory,
        upcomingAppointments: draft.upcomingAppointments,
        otherCaregivers: draft.otherCaregivers,
        dailyChecklist: draft.dailyChecklist,
        images: [],
        language: "en",
        acknowledgments: {
          briefing: false,
          history: false,
          appointments: false,
          caregivers: false,
          checklist: false
        },
        status: "pending",
        expiresAt: new Date(now.getTime() + EXPIRY_MS).toISOString()
      };
      data.addHandoverSession({ ...session, createdAt: now.toISOString() });
    } finally {
      setGenerating(false);
    }
  }

  if (activeSession) {
    return <HandoverQrDisplay session={activeSession} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="size-5 text-primary" />
          Hand over to a new caregiver
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Generate a 1-hour QR code that lets the next caregiver scan in and walk through the briefing,
          care history, appointments, team, and daily checklist. They acknowledge each tab before tasks unlock
          on their side.
        </p>
        <Button className="w-full" onClick={generate} disabled={generating}>
          <Plane className="size-4" />
          {generating ? "Generating…" : "Generate handover QR"}
        </Button>
      </CardContent>
    </Card>
  );
}
