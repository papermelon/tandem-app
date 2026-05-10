"use client";

import { Plane } from "lucide-react";

import { MobilePageHeader } from "@/components/dashboard/home/mobile-page-header";
import { CareHistoryChat } from "./care-history-chat";
import { GenerateHandoverQR } from "./generate-handover-qr";
import { ManageCareTeam } from "./manage-care-team";
import { OnboardTeamMember } from "./onboard-team-member";
import { PatientProfileSummary } from "./patient-profile-summary";

export function HandoverPageView() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-24">
      <MobilePageHeader title="Handover" icon={Plane} />

      <section className="space-y-4">
        <PatientProfileSummary />
        <CareHistoryChat />
        <GenerateHandoverQR />
        <OnboardTeamMember />
        <ManageCareTeam />
      </section>
    </div>
  );
}
