"use client";

import { ArrowRight, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CareProfileSummary } from "@/components/shared/care-profile-summary";
import type { CareRecipient } from "@/lib/types";

import { PatientAvatar } from "./patient-avatar";

type Props = {
  patient: CareRecipient;
  onBeginCare: (patientId: string) => void;
  onEdit: () => void;
};

export function PatientDetailCard({ patient, onBeginCare, onEdit }: Props) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-4">
          <PatientAvatar patient={patient} size="lg" />
          <div className="min-w-0">
            <div className="text-lg font-bold leading-6">{patient.name}</div>
            <div className="text-xs text-muted-foreground">
              {[
                patient.age ? `Age ${patient.age}` : null,
                patient.relationship,
                patient.country,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </div>

        <CareProfileSummary profile={patient.careProfile} phone={patient.phone} compact />

        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="gap-2" onClick={onEdit}>
            <Pencil className="size-4" />
            Edit profile
          </Button>
          <Button className="gap-2" onClick={() => onBeginCare(patient.id)}>
            Begin care
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
