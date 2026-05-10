"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";

import { MobilePageHeader } from "@/components/dashboard/home/mobile-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCareData } from "@/components/providers/care-data-provider";
import { HandoverIncomingView } from "@/components/handover/handover-incoming-view";

export default function HandoverSessionPage({ params }: { params: Promise<{ handoverId: string }> }) {
  const { handoverId } = use(params);
  const data = useCareData();
  const session = (data.handoverSessions ?? []).find((entry) => entry.id === handoverId);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-24">
      <MobilePageHeader title="Handover" icon={Plane} />

      {session ? (
        <HandoverIncomingView session={session} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Session not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>No handover session found for id {handoverId}.</p>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/handover">
                <ArrowLeft className="size-4" />
                Back to handover
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
