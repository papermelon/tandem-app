"use client";

import * as React from "react";
import { QrCode, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEA_LION_LANGUAGES, type LanguageCode } from "@/lib/languages";
import type { CareRecipient } from "@/lib/types";

type NewPatientDraft = Pick<
  CareRecipient,
  "name" | "age" | "relationship" | "country" | "language" | "emergencyContacts"
>;

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
  const [language, setLanguage] = React.useState<LanguageCode>("en");
  const [emergencyName, setEmergencyName] = React.useState("");
  const [emergencyRelationship, setEmergencyRelationship] = React.useState("");
  const [emergencyPhone, setEmergencyPhone] = React.useState("");

  if (!open) return null;

  const reset = () => {
    setName("");
    setAge("");
    setRelationship(RELATIONSHIPS[0]);
    setCountry(COUNTRIES[0]);
    setLanguage("en");
    setEmergencyName("");
    setEmergencyRelationship("");
    setEmergencyPhone("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const emergencyContacts =
      emergencyName.trim() && emergencyPhone.trim()
        ? [
            {
              name: emergencyName.trim(),
              relationship: emergencyRelationship.trim() || "Contact",
              phone: emergencyPhone.trim(),
            },
          ]
        : undefined;
    onCreate({
      name: name.trim(),
      age: Number(age) || 0,
      relationship,
      country,
      language,
      emergencyContacts,
    });
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] grid items-end justify-items-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Add loved one"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Add someone you care for</h2>
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
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Language</span>
            <select
              className="mt-1 block w-full rounded-xl border bg-white px-3 py-2 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            >
              {SEA_LION_LANGUAGES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label} · {option.native}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2 rounded-2xl border bg-muted/30 p-3">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Emergency contact (optional)
            </legend>
            <Input
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="Contact name"
            />
            <Input
              value={emergencyRelationship}
              onChange={(e) => setEmergencyRelationship(e.target.value)}
              placeholder="Relationship (e.g. Daughter)"
            />
            <Input
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              inputMode="tel"
              placeholder="+65 …"
            />
          </fieldset>

          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          OR
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full gap-2" onClick={onScanQR}>
          <QrCode className="size-4" />
          Scan a handover QR
        </Button>
      </div>
    </div>
  );
}
