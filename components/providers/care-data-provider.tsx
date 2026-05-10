"use client";

import * as React from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { CARE_DEMO_STORAGE_KEY, shouldForceDemoData } from "@/lib/demo-mode";
import { createSeedData } from "@/lib/seed-data";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type {
  AppData,
  CareRecipient,
  DocumentRecord,
  FamilyMember,
  Handover,
  HandoverSession,
  Task,
  TaskCategory,
  TimelineItem
} from "@/lib/types";

type CareDataContextValue = AppData & {
  mockMode: boolean;
  addTasks: (tasks: Omit<Task, "id">[]) => Task[];
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  addTimelineItem: (item: Omit<TimelineItem, "id" | "timestamp"> & { timestamp?: string }) => TimelineItem;
  addDocument: (document: Omit<DocumentRecord, "id" | "uploadedAt"> & { uploadedAt?: string }) => DocumentRecord;
  addHandover: (handover: Omit<Handover, "id" | "createdAt"> & { createdAt?: string }) => Handover;
  addHandoverSession: (session: Omit<HandoverSession, "id" | "createdAt"> & { id?: string; createdAt?: string }) => HandoverSession;
  updateHandoverSession: (sessionId: string, patch: Partial<HandoverSession>) => void;
  addMember: (member: Omit<FamilyMember, "id"> & { id?: string }) => FamilyMember;
  updateMember: (memberId: string, patch: Partial<FamilyMember>) => void;
  removeMember: (memberId: string) => void;
  updateRecipient: (recipientId: string, patch: Partial<CareRecipient>) => void;
  resetDemo: (caregiverName?: string) => void;
  memberName: (id?: string) => string;
  memberIdByName: (name?: string) => string | undefined;
  updateMemberPreferences: (
    memberId: string,
    patch: { categoryPreferences?: TaskCategory[]; loadCapacityPct?: number }
  ) => void;
};

const CareDataContext = React.createContext<CareDataContextValue | null>(null);

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStoredState() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CARE_DEMO_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppData) : null;
  } catch {
    return null;
  }
}

function renameDefaultCaregiver(data: AppData, name: string): AppData {
  const displayName = name.trim();
  if (!displayName) return data;

  return {
    ...data,
    members: data.members.map((member) =>
      member.id === "rachel"
        ? {
            ...member,
            name: displayName,
            avatar: displayName.slice(0, 1).toUpperCase() || member.avatar,
          }
        : member
    ),
  };
}

async function readSupabaseAccessToken() {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function persistJson(path: string, body: unknown, method = "POST") {
  try {
    await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    // Supabase writes are best-effort from the demo client. The local state remains usable offline.
  }
}

export function CareDataProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [data, setData] = React.useState<AppData | null>(null);
  const [mockMode, setMockMode] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const demoName = auth.profile?.name || "Caregiver";

    if (shouldForceDemoData() || auth.profile?.mode !== "supabase") {
      setData(renameDefaultCaregiver(readStoredState() ?? createSeedData(demoName), demoName));
      setMockMode(true);
      return;
    }

    setData(null);
    setMockMode(false);

    readSupabaseAccessToken()
      .then((token) => {
        if (!token) throw new Error("Missing Supabase session. Sign out and sign in again.");
        return fetch("/api/data/live", {
          headers: { Authorization: `Bearer ${token}` }
        });
      })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: AppData; needsOnboarding?: boolean; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not load live care data");
        if (cancelled) return;

        if (payload.data && !payload.needsOnboarding) {
          setData(payload.data);
          window.localStorage.removeItem(CARE_DEMO_STORAGE_KEY);
          return;
        }

        setData(renameDefaultCaregiver(createSeedData(demoName), demoName));
        setMockMode(true);
      })
      .catch(() => {
        if (cancelled) return;
        setData(renameDefaultCaregiver(readStoredState() ?? createSeedData(demoName), demoName));
        setMockMode(true);
      });

    return () => {
      cancelled = true;
    };
  }, [auth.profile?.mode, auth.profile?.name]);

  React.useEffect(() => {
    if (!data || !mockMode) return;

    try {
      window.localStorage.setItem(CARE_DEMO_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Local storage is a convenience for the demo, not a hard dependency.
    }
  }, [data, mockMode]);

  const memberName = React.useCallback(
    (id?: string) => {
      if (!id) return "Unclaimed";
      return data?.members.find((member) => member.id === id)?.name ?? "Family";
    },
    [data]
  );

  const memberIdByName = React.useCallback(
    (name?: string) => {
      if (!name) return undefined;
      const normalized = name.trim().toLowerCase();
      if (normalized === "rachel" || normalized === "lead caregiver") return "rachel";
      return data?.members.find((member) => member.name.toLowerCase() === normalized)?.id;
    },
    [data]
  );

  const updateTask = React.useCallback(
    (taskId: string, patch: Partial<Task>) => {
      setData((current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task))
            }
          : current
      );

      if (!mockMode) {
        void persistJson(`/api/data/tasks/${taskId}`, { patch }, "PATCH");
      }
    },
    [mockMode]
  );

  const addTasks = React.useCallback(
    (tasks: Omit<Task, "id">[]) => {
      const created = tasks.map((task) => ({ ...task, id: makeId("task") }));
      setData((current) => (current ? { ...current, tasks: [...created, ...current.tasks] } : current));

      if (!mockMode) {
        void persistJson("/api/data/tasks", { tasks: created });
      }

      return created;
    },
    [mockMode]
  );

  const addTimelineItem = React.useCallback(
    (item: Omit<TimelineItem, "id" | "timestamp"> & { timestamp?: string }) => {
      const created = { ...item, id: makeId("tl"), timestamp: item.timestamp ?? new Date().toISOString() };
      setData((current) => (current ? { ...current, timeline: [created, ...current.timeline] } : current));

      if (!mockMode) {
        void persistJson("/api/data/timeline", { item: created });
      }

      return created;
    },
    [mockMode]
  );

  const addDocument = React.useCallback(
    (document: Omit<DocumentRecord, "id" | "uploadedAt"> & { uploadedAt?: string }) => {
      const created = {
        ...document,
        id: makeId("doc"),
        uploadedAt: document.uploadedAt ?? new Date().toISOString()
      };
      setData((current) => (current ? { ...current, documents: [created, ...current.documents] } : current));

      if (!mockMode) {
        void persistJson("/api/data/documents", { document: created });
      }

      return created;
    },
    [mockMode]
  );

  const addHandover = React.useCallback(
    (handover: Omit<Handover, "id" | "createdAt"> & { createdAt?: string }) => {
      const created = { ...handover, id: makeId("handover"), createdAt: handover.createdAt ?? new Date().toISOString() };
      setData((current) => (current ? { ...current, handovers: [created, ...current.handovers] } : current));

      if (!mockMode) {
        void persistJson("/api/data/handovers", { handover: created });
      }

      return created;
    },
    [mockMode]
  );

  const addHandoverSession = React.useCallback(
    (session: Omit<HandoverSession, "id" | "createdAt"> & { id?: string; createdAt?: string }) => {
      const created: HandoverSession = {
        ...session,
        id: session.id ?? makeId("handover-session"),
        createdAt: session.createdAt ?? new Date().toISOString()
      };
      setData((current) =>
        current ? { ...current, handoverSessions: [created, ...(current.handoverSessions ?? [])] } : current
      );

      if (!mockMode) {
        void persistJson("/api/data/handover-sessions", { session: created });
      }

      return created;
    },
    [mockMode]
  );

  const updateHandoverSession = React.useCallback(
    (sessionId: string, patch: Partial<HandoverSession>) => {
      setData((current) =>
        current
          ? {
              ...current,
              handoverSessions: (current.handoverSessions ?? []).map((session) =>
                session.id === sessionId ? { ...session, ...patch } : session
              )
            }
          : current
      );

      if (!mockMode) {
        void persistJson(`/api/data/handover-sessions/${sessionId}`, { patch }, "PATCH");
      }
    },
    [mockMode]
  );

  const addMember = React.useCallback(
    (member: Omit<FamilyMember, "id"> & { id?: string }) => {
      const created: FamilyMember = { ...member, id: member.id ?? makeId("member") };
      setData((current) =>
        current ? { ...current, members: [...current.members, created] } : current
      );

      if (!mockMode) {
        void persistJson("/api/data/members", { member: created });
      }

      return created;
    },
    [mockMode]
  );

  const updateMember = React.useCallback(
    (memberId: string, patch: Partial<FamilyMember>) => {
      setData((current) =>
        current
          ? {
              ...current,
              members: current.members.map((member) => (member.id === memberId ? { ...member, ...patch } : member))
            }
          : current
      );

      if (!mockMode) {
        void persistJson(`/api/data/members/${memberId}`, { patch }, "PATCH");
      }
    },
    [mockMode]
  );

  const removeMember = React.useCallback(
    (memberId: string) => {
      setData((current) =>
        current
          ? {
              ...current,
              members: current.members.filter((member) => member.id !== memberId)
            }
          : current
      );

      if (!mockMode) {
        void persistJson(`/api/data/members/${memberId}`, {}, "DELETE");
      }
    },
    [mockMode]
  );

  const updateMemberPreferences = React.useCallback(
    (memberId: string, patch: { categoryPreferences?: TaskCategory[]; loadCapacityPct?: number }) => {
      setData((current) =>
        current
          ? {
              ...current,
              members: current.members.map((member: FamilyMember) =>
                member.id === memberId ? { ...member, ...patch } : member
              )
            }
          : current
      );

      if (!mockMode) {
        void persistJson(`/api/members/${memberId}/preferences`, patch, "PATCH");
      }
    },
    [mockMode]
  );

  const updateRecipient = React.useCallback(
    (recipientId: string, patch: Partial<CareRecipient>) => {
      setData((current) =>
        current
          ? {
              ...current,
              recipient: current.recipient.id === recipientId ? { ...current.recipient, ...patch } : current.recipient
            }
          : current
      );

      if (!mockMode) {
        void persistJson(`/api/data/care-recipients/${recipientId}`, { patch }, "PATCH");
      }
    },
    [mockMode]
  );

  const resetDemo = React.useCallback((caregiverName?: string) => {
    const seed = createSeedData(caregiverName || auth.profile?.name || "Caregiver");
    window.localStorage.removeItem(CARE_DEMO_STORAGE_KEY);
    setData(seed);
    setMockMode(true);
  }, [auth.profile?.name]);

  const value = React.useMemo<CareDataContextValue>(
    () => ({
      ...(data as AppData),
      mockMode,
      addTasks,
      updateTask,
      addTimelineItem,
      addDocument,
      addHandover,
      addHandoverSession,
      updateHandoverSession,
      addMember,
      updateMember,
      removeMember,
      updateRecipient,
      resetDemo,
      memberName,
      memberIdByName,
      updateMemberPreferences
    }),
    [
      addDocument,
      addHandover,
      addHandoverSession,
      addMember,
      addTasks,
      addTimelineItem,
      data,
      memberIdByName,
      memberName,
      mockMode,
      removeMember,
      resetDemo,
      updateHandoverSession,
      updateMember,
      updateMemberPreferences,
      updateRecipient,
      updateTask
    ]
  );

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            T
          </div>
          <div className="mt-4 text-lg font-bold">Loading Tandem</div>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Preparing Ah Muay care circle.</p>
        </div>
      </div>
    );
  }

  return <CareDataContext.Provider value={value}>{children}</CareDataContext.Provider>;
}

export function useCareData() {
  const value = React.useContext(CareDataContext);
  if (!value) {
    throw new Error("useCareData must be used inside CareDataProvider");
  }

  return value;
}
