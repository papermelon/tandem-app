"use client";

import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { HandoverPlaintext } from "@/lib/qr-handover";

import { PatientAvatar } from "./patient-avatar";

type Props = {
  open: boolean;
  payload: HandoverPlaintext | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmImportModal({ open, payload, onCancel, onConfirm }: Props) {
  if (!open || !payload) return null;
  const r = payload.recipient;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm import"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold">Add to your circle?</h2>

        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border bg-muted/40 p-4">
          <PatientAvatar patient={{ name: r.name, avatar: r.avatar }} size="lg" />
          <div className="text-center">
            <div className="font-bold">{r.name}</div>
            <div className="text-xs text-muted-foreground">
              {[r.age ? `Age ${r.age}` : null, r.relationship, r.country].filter(Boolean).join(" · ")}
            </div>
            {payload.fromCircleLabel ? (
              <div className="mt-2 text-xs text-muted-foreground">
                From: {payload.fromCircleLabel}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={onCancel}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button className="flex-1 gap-2" onClick={onConfirm}>
            <Check className="size-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
