"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CareProfileSummary } from "@/components/shared/care-profile-summary";
import type { CareRecipient, Task, TimelineItem } from "@/lib/types";

import { AvatarUploadModal } from "./avatar-upload-modal";
import { DailyTasksPreview } from "./daily-tasks-preview";
import { PatientAvatar } from "./patient-avatar";
import { UpcomingEventPreview } from "./upcoming-event-preview";

type Props = {
  patient: CareRecipient;
  tasks: Task[];
  timeline: TimelineItem[];
  otherPatientCount: number;
  resolveAssigneeName: (id?: string) => string;
  onAvatarChange: (dataUrl: string) => void;
  onEdit: () => void;
};

export function PatientCard({
  patient,
  tasks,
  timeline,
  otherPatientCount,
  resolveAssigneeName,
  onAvatarChange,
  onEdit,
}: Props) {
  const [avatarOpen, setAvatarOpen] = React.useState(false);

  return (
    <>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <PatientAvatar
              patient={patient}
              size="lg"
              extraCount={otherPatientCount}
              onClick={() => setAvatarOpen(true)}
            />
            <div className="min-w-0">
              <div className="text-lg font-bold leading-6">{patient.name}</div>
              <div className="text-xs text-muted-foreground">
                {[patient.relationship, patient.country].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>

          <UpcomingEventPreview items={timeline} />
          <DailyTasksPreview tasks={tasks} resolveAssigneeName={resolveAssigneeName} />
          <CareProfileSummary profile={patient.careProfile} compact />

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="gap-2" onClick={onEdit}>
              <Pencil className="size-4" />
              Edit profile
            </Button>
            <Button asChild variant="soft" className="gap-2">
              <Link href={`/capture?patientId=${encodeURIComponent(patient.id)}&patientName=${encodeURIComponent(patient.name)}`}>
                <Plus className="size-4" />
                New instruction
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AvatarUploadModal
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        onPick={onAvatarChange}
      />
    </>
  );
}
