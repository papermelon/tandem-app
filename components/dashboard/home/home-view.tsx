"use client";

import * as React from "react";
import { HeartPulse } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useCareData } from "@/components/providers/care-data-provider";
import { useHomeState } from "@/lib/home-state";
import { parseHandoverQR, type HandoverPlaintext } from "@/lib/qr-handover";
import type { CareRecipient } from "@/lib/types";

import { AddPatientModal } from "./add-patient-modal";
import { ConfirmImportModal } from "./confirm-import-modal";
import { PatientCard } from "./patient-card";
import { PatientSelector } from "./patient-selector";
import { QRScannerModal } from "./qr-scanner-modal";

export function HomeView() {
  const { tasks, timeline, memberName } = useCareData();
  const home = useHomeState();

  const [entered, setEntered] = React.useState(false);
  const [stage, setStage] = React.useState<"selector" | "dashboard">("selector");
  const [addOpen, setAddOpen] = React.useState(false);
  const [scanOpen, setScanOpen] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [pendingImport, setPendingImport] = React.useState<HandoverPlaintext | null>(null);

  const selected = home.state.patients.find((p) => p.id === home.state.selectedPatientId);
  const otherCount = Math.max(home.state.patients.length - 1, 0);

  const handleCreate = (
    draft: Pick<CareRecipient, "name" | "age" | "relationship" | "country">,
  ) => {
    home.addPatient(draft);
    setAddOpen(false);
  };

  const handleScanResult = async (raw: string) => {
    setScanOpen(false);
    try {
      const payload = await parseHandoverQR(raw);
      setPendingImport(payload);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Couldn't decode QR.");
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const r = pendingImport.recipient;
    home.importPatient({
      id: r.id,
      name: r.name,
      age: r.age ?? 0,
      relationship: r.relationship,
      country: r.country,
      avatar: r.avatar,
      context: r.context ?? "",
      address: r.address ?? "",
      careCircleId: r.careCircleId,
    });
    setPendingImport(null);
    setStage("dashboard");
  };

  if (!entered) {
    const hasName = Boolean(home.state.caregiver.name);
    return (
      <button
        type="button"
        onClick={() => setEntered(true)}
        className="fixed inset-0 z-50 grid w-full place-items-center bg-gradient-to-b from-white to-primary/5 p-8 text-center"
        aria-label="Enter Tandem"
      >
        <div className="flex flex-col items-center gap-4">
          <HeartPulse className="size-14 text-primary" />
          <div className="text-5xl font-bold tracking-tight">TANDEM</div>
          <div className="text-sm text-muted-foreground">
            {hasName
              ? `Welcome back, ${home.state.caregiver.name}. Tap to continue.`
              : "Tap to begin"}
          </div>
        </div>
      </button>
    );
  }

  const onSelector = stage === "selector" || !selected;
  const showNameField = home.hydrated && !home.state.caregiver.name;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-24">
      {onSelector ? (
        <header className="flex flex-col items-center py-4">
          <div className="flex items-center gap-2 text-xl font-bold">
            <HeartPulse className="size-5 text-primary" />
            TANDEM
          </div>
          {showNameField ? (
            <div className="mt-3 w-full max-w-xs">
              <Input
                autoFocus
                placeholder="Enter caregiver name"
                value={home.state.caregiver.name}
                onChange={(e) => home.setCaregiverName(e.target.value)}
                aria-label="Caregiver name"
              />
            </div>
          ) : home.state.caregiver.name ? (
            <div className="mt-2 text-sm text-muted-foreground">
              ← <span className="font-semibold text-foreground">{home.state.caregiver.name}</span> →
            </div>
          ) : null}
        </header>
      ) : (
        <header className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
          <button
            type="button"
            className="font-semibold text-foreground hover:underline"
            onClick={() => setStage("selector")}
            aria-label="Switch care recipient"
          >
            ← {home.state.caregiver.name || "Caregiver"}
          </button>
          <span>|</span>
          <span className="font-semibold text-foreground">{selected?.name}</span>
        </header>
      )}

      {onSelector ? (
        <PatientSelector
          patients={home.state.patients}
          selectedId={home.state.selectedPatientId}
          onSelect={home.selectPatient}
          onAdd={() => setAddOpen(true)}
          onBeginCare={(id) => {
            home.selectPatient(id);
            setStage("dashboard");
          }}
        />
      ) : selected ? (
        <PatientCard
          patient={selected}
          tasks={tasks}
          timeline={timeline}
          otherPatientCount={otherCount}
          resolveAssigneeName={memberName}
          onAvatarChange={(dataUrl) => home.updatePatient(selected.id, { avatar: dataUrl })}
        />
      ) : null}

      {scanError ? (
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {scanError}{" "}
          <button type="button" className="underline" onClick={() => setScanError(null)}>
            dismiss
          </button>
        </div>
      ) : null}

      <AddPatientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={handleCreate}
        onScanQR={() => {
          setAddOpen(false);
          setScanError(null);
          setScanOpen(true);
        }}
      />

      <QRScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onResult={handleScanResult}
      />

      <ConfirmImportModal
        open={Boolean(pendingImport)}
        payload={pendingImport}
        onCancel={() => setPendingImport(null)}
        onConfirm={confirmImport}
      />
    </div>
  );
}
