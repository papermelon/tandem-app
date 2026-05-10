"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Check, Copy, FastForward, QrCode, Sparkles, X } from "lucide-react";

import { useCareData } from "@/components/providers/care-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HandoverAcknowledgments, HandoverSession } from "@/lib/types";

const ACK_LABELS: Array<{ key: keyof HandoverAcknowledgments; label: string }> = [
  { key: "briefing", label: "Briefing" },
  { key: "history", label: "Care history" },
  { key: "appointments", label: "Appointments" },
  { key: "caregivers", label: "Caregivers" },
  { key: "checklist", label: "Checklist" }
];

function formatRemaining(ms: number) {
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export function HandoverQrDisplay({ session }: { session: HandoverSession }) {
  const { updateHandoverSession } = useCareData();
  const router = useRouter();
  const [now, setNow] = React.useState(() => Date.now());
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const expiresIn = new Date(session.expiresAt).getTime() - now;
  const expired = expiresIn <= 0;

  React.useEffect(() => {
    if (expired && session.status !== "expired" && session.status !== "completed") {
      updateHandoverSession(session.id, { status: "expired" });
    }
  }, [expired, session.id, session.status, updateHandoverSession]);

  const url = typeof window !== "undefined" ? `${window.location.origin}/handover/${session.id}` : `/handover/${session.id}`;
  const qrValue = `tandem://handover/v2?id=${encodeURIComponent(session.id)}`;

  const ackCount = ACK_LABELS.filter((row) => session.acknowledgments[row.key]).length;
  const checklistDone = session.dailyChecklist.filter((item) => item.completed).length;

  function cancel() {
    updateHandoverSession(session.id, { status: "cancelled" });
  }

  function startSimulation() {
    updateHandoverSession(session.id, { simulated: true });
    router.push(`/handover/${session.id}`);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignored
    }
  }

  const isCompleted = session.status === "completed";

  return (
    <div className="space-y-4">
      {!isCompleted ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <QrCode className="size-5 text-primary" />
                Handover QR
              </CardTitle>
              <Badge variant={expired ? "warning" : "secondary"}>
                {expired ? "expired" : session.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl border bg-white p-4">
              <QRCodeSVG value={qrValue} size={220} level="M" includeMargin />
              <div className="text-center text-xs text-muted-foreground">
                Have the incoming caregiver scan this from the home screen.
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border bg-white/70 p-3 text-sm">
              <span className="font-semibold">Expires in</span>
              <span className={expired ? "text-destructive" : ""}>{formatRemaining(expiresIn)}</span>
            </div>
            {!expired ? (
              <Button variant="secondary" className="w-full" onClick={startSimulation}>
                <FastForward className="size-4" />
                Simulate handover
              </Button>
            ) : null}
            <Button variant="outline" className="w-full" onClick={copyLink}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Link copied" : "Copy handover link"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Incoming progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ACK_LABELS.map((row) => {
            const acknowledged = session.acknowledgments[row.key];
            const isChecklist = row.key === "checklist";
            const totalChecklist = session.dailyChecklist.length;
            return (
              <div
                key={row.key}
                className="flex items-center justify-between rounded-2xl border bg-white/70 p-3 text-sm"
              >
                <span className="font-semibold">{row.label}</span>
                <Badge variant={acknowledged ? "success" : "secondary"}>
                  {acknowledged
                    ? "✓"
                    : isChecklist && totalChecklist > 0
                      ? `${checklistDone}/${totalChecklist}`
                      : "pending"}
                </Badge>
              </div>
            );
          })}
          <div className="text-center text-xs text-muted-foreground">{ackCount}/5 tabs acknowledged</div>

          {session.status === "completed" ? (
            <div className="space-y-2 border-t pt-3">
              <Button asChild className="w-full">
                <Link href={`/handover/${session.id}/complete`}>
                  Open handover summary
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/wrapped/${session.departingCaregiverId}`}>
                  <Sparkles className="size-4" />
                  View Caregiver Wrapped
                </Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {session.status === "pending" || session.status === "in-progress" ? (
        <Button variant="outline" className="w-full" onClick={cancel}>
          <X className="size-4" />
          Cancel handover
        </Button>
      ) : null}
    </div>
  );
}
