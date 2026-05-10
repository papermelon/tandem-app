"use client";

import { Stethoscope } from "lucide-react";

import { MobilePageHeader } from "@/components/dashboard/home/mobile-page-header";
import { useT } from "@/lib/i18n";
import { CareHistoryChat } from "./care-history-chat";
import { GenerateHandoverQR } from "./generate-handover-qr";
import { ManageCareTeam } from "./manage-care-team";
import { OnboardTeamMember } from "./onboard-team-member";
import { PatientProfileSummary } from "./patient-profile-summary";

export function HandoverPageView() {
  const t = useT();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-24">
      <MobilePageHeader title={t("nav.health")} icon={Stethoscope} />

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
