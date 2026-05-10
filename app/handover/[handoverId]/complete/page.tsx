"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Plane, Sparkles } from "lucide-react";

import { MobilePageHeader } from "@/components/dashboard/home/mobile-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCareData } from "@/components/providers/care-data-provider";

export default function HandoverCompletePage({ params }: { params: Promise<{ handoverId: string }> }) {
  const { handoverId } = use(params);
  const data = useCareData();
  const session = (data.handoverSessions ?? []).find((entry) => entry.id === handoverId);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-24">
      <MobilePageHeader title="Handover complete" icon={Plane} />

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-primary" />
              Handover complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6">
            {session ? (
              <>
                <p>
                  {data.memberName(session.departingCaregiverId)} handed over care for {data.recipient.name}. The
                  incoming caregiver now has full access to tasks and the timeline.
                </p>
                {session.completedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Archived in timeline at {new Date(session.completedAt).toLocaleString()}.
                  </p>
                ) : null}
              </>
            ) : (
              <p>This handover has been archived.</p>
            )}
          </CardContent>
        </Card>

        {session?.simulated ? (
          <Button asChild variant="outline" className="w-full">
            <Link href="/handover">
              <ArrowLeft className="size-4" />
              Back to handover
            </Link>
          </Button>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                Caregiver Wrapped
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Celebrate the care you&apos;ve given. Open Wrapped to view and share.</p>
              {session ? (
                <Button asChild className="w-full">
                  <Link href={`/wrapped/${session.departingCaregiverId}`}>
                    View Caregiver Wrapped
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" className="w-full">
                <Link href="/handover">Back to handover</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
