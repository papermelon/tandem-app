import type { CircleRole, Permission, PermissionSet } from "@/lib/types";

export const ALL_PERMISSIONS: Permission[] = [
  "see_care_history",
  "get_notified_care_updates",
  "create_tasks",
  "edit_patient_profile",
  "manage_permissions",
  "invite_others",
  "view_documents",
  "edit_care_notes"
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  see_care_history: "See care history",
  get_notified_care_updates: "Get notified of care updates",
  create_tasks: "Create tasks",
  edit_patient_profile: "Edit patient profile",
  manage_permissions: "Manage permissions",
  invite_others: "Invite others",
  view_documents: "View documents",
  edit_care_notes: "Add or edit care notes"
};

export const ROLE_LABELS: Record<CircleRole, string> = {
  primary_caregiver: "Primary caregiver",
  family_member: "Family member",
  temporary_caregiver: "Temporary caregiver"
};

export function defaultPermissions(role: CircleRole): PermissionSet {
  if (role === "primary_caregiver") {
    return {
      see_care_history: true,
      get_notified_care_updates: true,
      create_tasks: true,
      edit_patient_profile: true,
      manage_permissions: true,
      invite_others: true,
      view_documents: true,
      edit_care_notes: true
    };
  }
  if (role === "temporary_caregiver") {
    return {
      see_care_history: true,
      get_notified_care_updates: true,
      create_tasks: true,
      edit_patient_profile: false,
      manage_permissions: false,
      invite_others: false,
      view_documents: true,
      edit_care_notes: true
    };
  }
  return {
    see_care_history: true,
    get_notified_care_updates: true,
    create_tasks: false,
    edit_patient_profile: false,
    manage_permissions: false,
    invite_others: false,
    view_documents: false,
    edit_care_notes: false
  };
}

export function describeAccessExpiry(accessExpiresAt?: string): string | null {
  if (!accessExpiresAt) return null;
  const ms = new Date(accessExpiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return "Access expired";
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return "Expires today";
  if (days === 1) return "1 day left";
  if (days < 31) return `${days} days left`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} left`;
}
