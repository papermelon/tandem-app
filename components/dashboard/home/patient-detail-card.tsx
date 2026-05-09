"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CareRecipient } from "@/lib/types";

import { PatientAvatar } from "./patient-avatar";

type Props = {
  patient: CareRecipient;
  onBeginCare: (patientId: string) => void;
};

export function PatientDetailCard({ patient, onBeginCare }: Props) {
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

        <Button className="w-full gap-2" onClick={() => onBeginCare(patient.id)}>
          Begin care
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
