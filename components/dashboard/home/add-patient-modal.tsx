"use client";

import * as React from "react";
import { QrCode, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CareRecipient } from "@/lib/types";

type NewPatientDraft = Pick<CareRecipient, "name" | "age" | "relationship" | "country">;

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: NewPatientDraft) => void;
  onScanQR: () => void;
};

const RELATIONSHIPS = ["Mother", "Father", "Grandmother", "Grandfather", "Spouse", "Aunt", "Uncle", "Other"];
const COUNTRIES = ["Singapore", "Malaysia", "Thailand", "Vietnam", "Indonesia", "Philippines", "Other"];

export function AddPatientModal({ open, onClose, onCreate, onScanQR }: Props) {
  const [name, setName] = React.useState("");
  const [age, setAge] = React.useState("");
  const [relationship, setRelationship] = React.useState(RELATIONSHIPS[0]);
  const [country, setCountry] = React.useState(COUNTRIES[0]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      age: Number(age) || 0,
      relationship,
      country,
    });
    setName("");
    setAge("");
    setRelationship(RELATIONSHIPS[0]);
    setCountry(COUNTRIES[0]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] grid items-end justify-items-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="New care recipient"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">New care recipient</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ah Muay" required />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Age</span>
            <Input
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="70"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Relationship</span>
            <select
              className="mt-1 block w-full rounded-xl border bg-white px-3 py-2 text-sm"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Country</span>
            <select
              className="mt-1 block w-full rounded-xl border bg-white px-3 py-2 text-sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>

          <Button type="submit" className="w-full">
            Start caring
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          OR
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full gap-2" onClick={onScanQR}>
          <QrCode className="size-4" />
          Scan from handover
        </Button>
      </div>
    </div>
  );
}
