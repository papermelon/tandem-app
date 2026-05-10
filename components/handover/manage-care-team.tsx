"use client";

import * as React from "react";
import { Shield, Trash2, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCareData } from "@/components/providers/care-data-provider";
import { ALL_PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS, describeAccessExpiry } from "@/lib/permissions";
import type { CircleRole, FamilyMember, Permission, PermissionSet } from "@/lib/types";

export function ManageCareTeam() {
  const data = useCareData();
  const [editingId, setEditingId] = React.useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          Care team & permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            editing={editingId === member.id}
            onToggleEdit={() => setEditingId((current) => (current === member.id ? null : member.id))}
            onPatch={(patch) => data.updateMember(member.id, patch)}
            onRemove={() => {
              if (member.isDefaultCaregiver) return;
              if (typeof window !== "undefined" && !window.confirm(`Remove ${member.name} from the circle?`)) return;
              data.removeMember(member.id);
              setEditingId(null);
            }}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function MemberRow({
  member,
  editing,
  onToggleEdit,
  onPatch,
  onRemove
}: {
  member: FamilyMember;
  editing: boolean;
  onToggleEdit: () => void;
  onPatch: (patch: Partial<FamilyMember>) => void;
  onRemove: () => void;
}) {
  const role: CircleRole = member.circleRole ?? (member.isDefaultCaregiver ? "primary_caregiver" : "family_member");
  const permissions: PermissionSet = member.permissions ?? {
    see_care_history: true,
    get_notified_care_updates: true,
    create_tasks: false,
    edit_patient_profile: false,
    manage_permissions: false,
    invite_others: false,
    view_documents: false,
    edit_care_notes: false
  };
  const expiry = describeAccessExpiry(member.accessExpiresAt);

  function toggle(permission: Permission) {
    onPatch({ permissions: { ...permissions, [permission]: !permissions[permission] } });
  }

  return (
    <div className="space-y-2 rounded-2xl border bg-white/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-bold">{member.name}</div>
          <div className="text-xs text-muted-foreground">
            {ROLE_LABELS[role]}
            {member.role && member.role !== ROLE_LABELS[role] ? ` · ${member.role}` : ""}
          </div>
          {expiry ? (
            <Badge variant={expiry === "Access expired" ? "warning" : "secondary"} className="mt-1">
              {expiry}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onToggleEdit}>
            <UserCog className="size-3" />
            {editing ? "Done" : "Edit"}
          </Button>
          {!member.isDefaultCaregiver ? (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="size-3" />
            </Button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="space-y-1 border-t pt-3">
          {ALL_PERMISSIONS.map((permission) => (
            <label
              key={permission}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1 text-sm hover:bg-muted/40"
            >
              <input
                type="checkbox"
                checked={permissions[permission]}
                onChange={() => toggle(permission)}
                className="size-4 accent-[var(--primary)]"
                disabled={role === "primary_caregiver"}
              />
              <span>{PERMISSION_LABELS[permission]}</span>
            </label>
          ))}
          {role === "primary_caregiver" ? (
            <p className="px-2 text-xs text-muted-foreground">
              Primary caregivers always have all permissions.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1 pt-1">
          {ALL_PERMISSIONS.filter((permission) => permissions[permission]).map((permission) => (
            <Badge key={permission} variant="secondary" className="text-[10px]">
              {PERMISSION_LABELS[permission]}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
