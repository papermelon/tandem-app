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
import { EditPatientModal } from "./edit-patient-modal";
import { PatientCard } from "./patient-card";
import { PatientSelector } from "./patient-selector";
import { QRScannerModal } from "./qr-scanner-modal";

export function HomeView() {
  const { recipient, tasks, timeline, memberName, mockMode, updateRecipient } = useCareData();
  const home = useHomeState();

  const [stage, setStage] = React.useState<"selector" | "dashboard">("selector");
  const [addOpen, setAddOpen] = React.useState(false);
  const [scanOpen, setScanOpen] = React.useState(false);
  const [editingPatientId, setEditingPatientId] = React.useState<string | null>(null);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [pendingImport, setPendingImport] = React.useState<HandoverPlaintext | null>(null);

  const liveProfileMode = !mockMode;
  const patients = liveProfileMode ? [recipient] : home.state.patients;
  const selectedPatientId = liveProfileMode ? recipient.id : home.state.selectedPatientId;
  const selected = patients.find((p) => p.id === selectedPatientId) ?? patients[0];
  const editingPatient = patients.find((p) => p.id === editingPatientId) ?? null;
  const otherCount = Math.max(patients.length - 1, 0);

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
      careProfile: r.careProfile,
    });
    setPendingImport(null);
    setStage("dashboard");
  };

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
          patients={patients}
          selectedId={selectedPatientId}
          onSelect={(id) => {
            if (!liveProfileMode) home.selectPatient(id);
          }}
          onAdd={() => setAddOpen(true)}
          onEdit={setEditingPatientId}
          allowAdd={!liveProfileMode}
          onBeginCare={(id) => {
            if (!liveProfileMode) home.selectPatient(id);
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
          onEdit={() => setEditingPatientId(selected.id)}
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

      <EditPatientModal
        open={Boolean(editingPatient)}
        patient={editingPatient}
        onClose={() => setEditingPatientId(null)}
        onSave={(patch) => {
          if (!editingPatient) return;
          if (liveProfileMode) {
            updateRecipient(editingPatient.id, patch);
          } else {
            home.updatePatient(editingPatient.id, patch);
          }
          setEditingPatientId(null);
        }}
        onRemove={() => {
          if (!editingPatient) return;
          if (liveProfileMode) return;
          home.removePatient(editingPatient.id);
          setEditingPatientId(null);
          setStage("selector");
        }}
        canRemove={!liveProfileMode}
        liveMode={liveProfileMode}
      />
    </div>
  );
}
