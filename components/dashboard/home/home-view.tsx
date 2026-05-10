"use client";

import * as React from "react";
import { ArrowRight, ChevronLeft, HeartPulse } from "lucide-react";

import { Button } from "@/components/ui/button";
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

  const entered = home.state.hasEntered ?? false;
  const stage: "selector" | "dashboard" = home.state.hasBegunCare ? "dashboard" : "selector";
  const setStage = (next: "selector" | "dashboard") => {
    home.setHasBegunCare(next === "dashboard");
  };
  const [addOpen, setAddOpen] = React.useState(false);
  const [scanOpen, setScanOpen] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [pendingImport, setPendingImport] = React.useState<HandoverPlaintext | null>(null);

  const selected = home.state.patients.find((p) => p.id === home.state.selectedPatientId);
  const otherCount = Math.max(home.state.patients.length - 1, 0);

  const handleCreate = (
    draft: Pick<CareRecipient, "name" | "age" | "relationship" | "country" | "language" | "emergencyContacts">,
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
    return <SplashForm home={home} />;
  }

  const onSelector = stage === "selector" || !selected;
  const showNameField = home.hydrated && !home.state.caregiver.name;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-24">
      {onSelector ? (
        <header className="relative flex flex-col items-center py-4">
          <button
            type="button"
            onClick={() => home.unmarkEntered()}
            aria-label="Back to title screen"
            className="absolute left-0 top-3 grid size-9 place-items-center rounded-full hover:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>
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
            <div className="mt-2 text-sm font-semibold text-foreground">{home.state.caregiver.name}</div>
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

function SplashForm({ home }: { home: ReturnType<typeof useHomeState> }) {
  const [revealed, setRevealed] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [feedback, setFeedback] = React.useState<{ kind: "new"; name: string } | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const trimmed = username.trim();
  const existing = trimmed ? home.findAccount(trimmed) : null;
  const hint = !trimmed
    ? "Enter your username to begin"
    : existing
      ? `Welcome back, ${existing.name}.`
      : `We'll create a new account for "${trimmed}".`;

  React.useEffect(() => {
    if (revealed) {
      // Wait for the height transition to start so the focus doesn't fight the animation.
      const id = window.setTimeout(() => inputRef.current?.focus(), 250);
      return () => window.clearTimeout(id);
    }
  }, [revealed]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    const result = home.signInOrCreate(trimmed);
    if (result?.isNew) {
      setFeedback({ kind: "new", name: result.name });
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid w-full place-items-center bg-gradient-to-b from-white to-primary/5 p-8 text-center">
      <form onSubmit={submit} className="flex w-full max-w-xs flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => setRevealed(true)}
          aria-label={revealed ? "Tandem" : "Reveal sign in"}
          className="flex flex-col items-center gap-2 rounded-2xl px-4 py-2 transition-transform duration-500 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <HeartPulse className="size-14 text-primary" />
          <div className="text-5xl font-bold tracking-tight">TANDEM</div>
        </button>
        <div
          className={`grid w-full transition-all duration-500 ease-out ${
            revealed ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!revealed}
        >
          <div className="flex flex-col items-center gap-4 overflow-hidden">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {feedback ? `Account created for ${feedback.name}.` : hint}
            </p>
            <Input
              ref={inputRef}
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setFeedback(null);
              }}
              placeholder="Username"
              aria-label="Username"
              autoComplete="username"
              tabIndex={revealed ? 0 : -1}
            />
            <Button type="submit" className="w-full" disabled={!trimmed} tabIndex={revealed ? 0 : -1}>
              {existing ? "Continue" : "Create account"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
        {!revealed ? (
          <p className="mt-2 text-xs text-muted-foreground">Tap the logo to begin</p>
        ) : null}
      </form>
    </div>
  );
}
