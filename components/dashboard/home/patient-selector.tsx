"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CareRecipient } from "@/lib/types";

import { PatientAvatar } from "./patient-avatar";
import { PatientDetailCard } from "./patient-detail-card";

type Props = {
  patients: CareRecipient[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onBeginCare: (id: string) => void;
  onEdit: (id: string) => void;
  allowAdd?: boolean;
};

export function PatientSelector({ patients, selectedId, onSelect, onAdd, onBeginCare, onEdit, allowAdd = true }: Props) {
  const selected = patients.find((p) => p.id === selectedId) ?? patients[0];
  const others = patients.length > 1 ? patients.length - 1 : 0;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold">Who are you caring for today?</h2>

      {patients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Plus className="size-6" />
            </div>
            <div>
              <div className="font-bold">Add the person you care for</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Set up a profile or scan a handover QR to get started.
              </p>
            </div>
            <Button onClick={onAdd}>Add care recipient</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex items-center gap-4 overflow-x-auto p-4">
              {patients.map((p, i) => (
                <PatientAvatar
                  key={p.id}
                  patient={p}
                  size="md"
                  extraCount={i === 0 ? others : 0}
                  onClick={() => onSelect(p.id)}
                />
              ))}
              {allowAdd ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="flex flex-col items-center gap-1"
                  aria-label="Add care recipient"
                >
                  <span className="grid size-12 place-items-center rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground">
                    <Plus className="size-5" />
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">Add</span>
                </button>
              ) : null}
            </CardContent>
          </Card>

          {selected ? (
            <PatientDetailCard
              patient={selected}
              onBeginCare={onBeginCare}
              onEdit={() => onEdit(selected.id)}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
