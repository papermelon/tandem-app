"use client";

import * as React from "react";
import { UserPlus, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCareData } from "@/components/providers/care-data-provider";
import { ALL_PERMISSIONS, PERMISSION_LABELS, defaultPermissions } from "@/lib/permissions";
import type { CircleRole, FamilyMember, Permission, PermissionSet } from "@/lib/types";

const FAMILY_RELATIONSHIPS = ["Daughter", "Son", "Sibling", "Spouse", "Friend", "Other"];

export function OnboardTeamMember() {
  const [open, setOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          Add to care team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Bring a family member into the circle for ongoing involvement. Temporary caregivers self-onboard via the
          handover QR above.
        </p>
        <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
          <UserPlus className="size-4" />
          Add family member
        </Button>
      </CardContent>
      {open ? <FamilyMemberModal onClose={() => setOpen(false)} /> : null}
    </Card>
  );
}

function ModalShell({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function PermissionsCheckboxes({
  permissions,
  onToggle
}: {
  permissions: PermissionSet;
  onToggle: (key: Permission) => void;
}) {
  return (
    <div className="space-y-2 rounded-2xl border bg-muted/30 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</div>
      {ALL_PERMISSIONS.map((permission) => (
        <label
          key={permission}
          className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1 text-sm hover:bg-white/60"
        >
          <input
            type="checkbox"
            checked={permissions[permission]}
            onChange={() => onToggle(permission)}
            className="size-4 accent-[var(--primary)]"
          />
          <span>{PERMISSION_LABELS[permission]}</span>
        </label>
      ))}
    </div>
  );
}

function FamilyMemberModal({ onClose }: { onClose: () => void }) {
  const data = useCareData();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [relationship, setRelationship] = React.useState(FAMILY_RELATIONSHIPS[0]);
  const [permissions, setPermissions] = React.useState<PermissionSet>(() => defaultPermissions("family_member"));
  const [submitting, setSubmitting] = React.useState(false);

  function toggle(permission: Permission) {
    setPermissions((current) => ({ ...current, [permission]: !current[permission] }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    const member: Omit<FamilyMember, "id"> = {
      name: name.trim(),
      role: relationship,
      avatar: name.trim().slice(0, 1).toUpperCase(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      circleRole: "family_member",
      permissions,
      invitedAt: new Date().toISOString()
    };
    data.addMember(member);
    onClose();
  }

  return (
    <ModalShell title="Add family member" onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <Field label="Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Tom" />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tom@example.com"
          />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+65 …" />
        </Field>
        <Field label="Relationship">
          <Select value={relationship} onChange={(event) => setRelationship(event.target.value)}>
            {FAMILY_RELATIONSHIPS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <PermissionsCheckboxes permissions={permissions} onToggle={toggle} />
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={!name.trim() || submitting}>
            Add member
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// Re-export for convenience: a non-form caller can use these modals directly if needed.
export type { CircleRole };
