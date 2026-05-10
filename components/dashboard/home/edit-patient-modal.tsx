"use client";

import * as React from "react";
import { Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CareProfileSection, CareRecipient } from "@/lib/types";

type PatientDraft = Pick<
  CareRecipient,
  "name" | "age" | "relationship" | "country" | "context" | "address" | "careProfile"
>;

type Props = {
  open: boolean;
  patient: CareRecipient | null;
  onClose: () => void;
  onSave: (patch: PatientDraft) => void;
  onRemove: () => void;
  canRemove?: boolean;
  liveMode?: boolean;
};

const RELATIONSHIPS = ["Mother", "Father", "Grandmother", "Grandfather", "Spouse", "Aunt", "Uncle", "Other"];
const COUNTRIES = ["Singapore", "Malaysia", "Thailand", "Vietnam", "Indonesia", "Philippines", "Other"];

const blankSection = (): CareProfileSection => ({ label: "", value: "", notes: [] });

export function EditPatientModal({ open, patient, onClose, onSave, onRemove, canRemove = true, liveMode = false }: Props) {
  const [name, setName] = React.useState("");
  const [age, setAge] = React.useState("");
  const [relationship, setRelationship] = React.useState(RELATIONSHIPS[0]);
  const [country, setCountry] = React.useState(COUNTRIES[0]);
  const [context, setContext] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [sections, setSections] = React.useState<CareProfileSection[]>([]);

  React.useEffect(() => {
    if (!patient || !open) return;
    setName(patient.name);
    setAge(patient.age ? String(patient.age) : "");
    setRelationship(patient.relationship || RELATIONSHIPS[0]);
    setCountry(patient.country || COUNTRIES[0]);
    setContext(patient.context || "");
    setAddress(patient.address || "");
    setSummary(patient.careProfile?.summary || "");
    setSections(patient.careProfile?.sections?.length ? patient.careProfile.sections : [blankSection()]);
  }, [open, patient]);

  if (!open || !patient) return null;

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanedSections = sections
      .map((section) => ({
        label: section.label.trim(),
        value: section.value.trim(),
        notes: (section.notes ?? []).map((note) => note.trim()).filter(Boolean),
      }))
      .filter((section) => section.label || section.value || section.notes.length);

    onSave({
      name: name.trim() || patient.name,
      age: Number(age) || 0,
      relationship,
      country,
      context: context.trim(),
      address: address.trim(),
      careProfile:
        summary.trim() || cleanedSections.length
          ? {
              summary: summary.trim(),
              updatedAt: new Date().toLocaleDateString("en-SG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              sections: cleanedSections,
            }
          : undefined,
    });
  };

  const updateSection = (index: number, patch: Partial<CareProfileSection>) => {
    setSections((current) =>
      current.map((section, i) => (i === index ? { ...section, ...patch } : section)),
    );
  };

  const remove = () => {
    const confirmed = window.confirm(`Remove ${patient.name}'s profile from this browser?`);
    if (!confirmed) return;
    onRemove();
  };

  return (
    <div
      className="fixed inset-0 z-[120] grid items-end justify-items-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${patient.name}`}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Edit care profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={save}>
          <section className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <div className="grid grid-cols-[0.55fr_1fr] gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Age</span>
                <Input
                  value={age}
                  onChange={(event) => setAge(event.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Relationship</span>
                <select
                  className="mt-1 block h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value)}
                >
                  {RELATIONSHIPS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Country</span>
              <select
                className="mt-1 block h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                {COUNTRIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Care context</span>
              <Textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="Mild dementia, recent fall, rehab follow-up"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Address</span>
              <Input value={address} onChange={(event) => setAddress(event.target.value)} />
            </label>
          </section>

          <section className="space-y-3 rounded-2xl border bg-muted/20 p-3">
            <div>
              <div className="text-sm font-bold">Quick reference</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Notes family members need before meals, mobility, or daily safety checks.
              </p>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Summary</span>
              <Textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Quick reference for meals, mobility, and daily safety checks."
              />
            </label>

            {sections.map((section, index) => (
              <div key={index} className="space-y-2 rounded-xl border bg-white/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Reference item {index + 1}
                  </div>
                  {sections.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-destructive"
                      onClick={() => setSections((current) => current.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <Input
                  value={section.label}
                  onChange={(event) => updateSection(index, { label: event.target.value })}
                  placeholder="Food texture"
                />
                <Input
                  value={section.value}
                  onChange={(event) => updateSection(index, { value: event.target.value })}
                  placeholder="Soft foods preferred"
                />
                <Textarea
                  value={(section.notes ?? []).join("\n")}
                  onChange={(event) =>
                    updateSection(index, { notes: event.target.value.split("\n") })
                  }
                  placeholder="One note per line"
                />
              </div>
            ))}

            <Button type="button" variant="outline" className="w-full" onClick={() => setSections((current) => [...current, blankSection()])}>
              Add reference item
            </Button>
          </section>

          <div className="space-y-2">
            <Button type="submit" className="w-full">
              Save profile
            </Button>
            {canRemove ? (
              <>
                <Button type="button" variant="destructive" className="w-full" onClick={remove}>
                  <Trash2 className="size-4" />
                  Remove profile from this browser
                </Button>
                <p className="px-1 text-xs leading-5 text-muted-foreground">
                  Removing only affects the demo data on this browser. Shared account records are not deleted.
                </p>
              </>
            ) : liveMode ? (
              <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
                This shared profile is connected to your account. Edits are visible to signed-in family members; removal is disabled for the demo.
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
