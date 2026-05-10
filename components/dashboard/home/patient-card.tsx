"use client";

import * as React from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CareProfileSummary } from "@/components/shared/care-profile-summary";
import type { CareRecipient, Task, TimelineItem } from "@/lib/types";

import { AvatarUploadModal } from "./avatar-upload-modal";
import { CaregiverInputPanel } from "./caregiver-input-panel";
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
          <CaregiverInputPanel patient={patient} />

          <div>
            <Button variant="outline" className="gap-2" onClick={onEdit}>
              <Pencil className="size-4" />
              Edit profile
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
