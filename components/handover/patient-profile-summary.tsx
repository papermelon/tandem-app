"use client";

import { AlertCircle, HeartPulse, Phone, Pill, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCareData } from "@/components/providers/care-data-provider";

export function PatientProfileSummary() {
  const data = useCareData();
  const { recipient, members } = data;
  const activeCaregivers = members.filter(
    (member) => member.circleRole === "primary_caregiver" || member.circleRole === "temporary_caregiver"
  ).length;
  const familyCount = members.filter((member) => member.circleRole === "family_member").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          Patient profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border bg-white/70 p-3">
          <div className="grid size-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {recipient.name.slice(0, 1)}
          </div>
          <div>
            <div className="font-bold">{recipient.name}</div>
            <div className="text-xs text-muted-foreground">
              {recipient.age} years old{recipient.relationship ? ` · ${recipient.relationship}` : ""}
            </div>
            <div className="text-xs text-muted-foreground">{recipient.address}</div>
          </div>
        </div>

        <ProfileRow icon={HeartPulse} label="Medical conditions" items={recipient.medicalConditions} />
        <ProfileRow icon={AlertCircle} label="Allergies" items={recipient.allergies} accent="warning" />
        <ProfileRow icon={Pill} label="Current medications" items={recipient.currentMedications} />

        {recipient.emergencyContacts && recipient.emergencyContacts.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Phone className="size-3" />
              Emergency contacts
            </div>
            <div className="space-y-2">
              {recipient.emergencyContacts.map((contact) => (
                <div
                  key={`${contact.name}-${contact.phone}`}
                  className="flex items-center justify-between rounded-2xl border bg-white/70 p-3 text-sm"
                >
                  <div>
                    <div className="font-bold">{contact.name}</div>
                    <div className="text-xs text-muted-foreground">{contact.relationship}</div>
                  </div>
                  <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="text-sm font-semibold text-primary">
                    {contact.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border bg-white/70 p-3 text-center">
            <div className="text-2xl font-bold">{activeCaregivers}</div>
            <div className="text-xs text-muted-foreground">Active caregivers</div>
          </div>
          <div className="rounded-2xl border bg-white/70 p-3 text-center">
            <div className="text-2xl font-bold">{familyCount}</div>
            <div className="text-xs text-muted-foreground">Family members</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  items,
  accent
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  items?: string[];
  accent?: "warning";
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant={accent === "warning" ? "warning" : "secondary"}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
