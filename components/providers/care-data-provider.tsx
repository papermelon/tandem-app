"use client";

import * as React from "react";
import Image from "next/image";
import { HeartPulse, Mail, UserPlus } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSeedData } from "@/lib/seed-data";
import { CARE_DEMO_STORAGE_KEY, shouldForceDemoData } from "@/lib/demo-mode";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AppData, CareRecipient, DocumentRecord, FamilyMember, Handover, Task, TaskCategory, TimelineItem } from "@/lib/types";

type CareDataContextValue = AppData & {
  mockMode: boolean;
  addTasks: (tasks: Omit<Task, "id">[]) => Task[];
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  addTimelineItem: (item: Omit<TimelineItem, "id" | "timestamp"> & { timestamp?: string }) => TimelineItem;
  addDocument: (document: Omit<DocumentRecord, "id" | "uploadedAt"> & { uploadedAt?: string }) => DocumentRecord;
  addHandover: (handover: Omit<Handover, "id" | "createdAt"> & { createdAt?: string }) => Handover;
  updateRecipient: (recipientId: string, patch: Partial<CareRecipient>) => void;
  resetDemo: () => void;
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
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false);
  const [liveError, setLiveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (shouldForceDemoData()) {
      setData(readStoredState() ?? createSeedData());
      setMockMode(true);
      setNeedsOnboarding(false);
      setLiveError(null);
      return;
    }

    if (auth.profile?.mode === "supabase") {
      setData(null);
      setMockMode(false);
      setNeedsOnboarding(false);
      setLiveError(null);

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
          if (payload.needsOnboarding) {
            setData(null);
            setNeedsOnboarding(true);
            window.localStorage.removeItem(CARE_DEMO_STORAGE_KEY);
            return;
          }
          if (payload.data) {
            setData(payload.data);
            setNeedsOnboarding(false);
            window.localStorage.removeItem(CARE_DEMO_STORAGE_KEY);
          }
        })
        .catch((error) => {
          if (cancelled) return;
          setLiveError(error instanceof Error ? error.message : "Could not load live care data");
          setNeedsOnboarding(true);
        });

      return () => {
        cancelled = true;
      };
    }

    fetch("/api/demo-data")
      .then((response) => response.json())
      .then((payload: { data?: AppData; mockMode?: boolean }) => {
        if (cancelled) return;
        if (payload.data) {
          setData(payload.data);
          const isMockMode = Boolean(payload.mockMode);
          setMockMode(isMockMode);
          setNeedsOnboarding(false);
          if (!isMockMode) {
            window.localStorage.removeItem(CARE_DEMO_STORAGE_KEY);
          }
          return;
        }

        const storedState = readStoredState();
        if (storedState) {
          setData(storedState);
          setMockMode(true);
          setNeedsOnboarding(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setData(readStoredState() ?? createSeedData());
        setMockMode(true);
        setNeedsOnboarding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth.profile?.mode]);

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
              recipient:
                current.recipient.id === recipientId
                  ? { ...current.recipient, ...patch }
                  : current.recipient
            }
          : current
      );

      if (!mockMode) {
        void persistJson(`/api/data/care-recipients/${recipientId}`, { patch }, "PATCH");
      }
    },
    [mockMode]
  );

  const resetDemo = React.useCallback(() => {
    const seed = createSeedData();
    window.localStorage.removeItem(CARE_DEMO_STORAGE_KEY);
    setData(seed);
    setMockMode(true);
  }, []);

  const completeLiveOnboarding = React.useCallback((nextData: AppData) => {
    setData(nextData);
    setMockMode(false);
    setNeedsOnboarding(false);
    setLiveError(null);
  }, []);

  const value = React.useMemo<CareDataContextValue>(
    () => ({
      ...(data as AppData),
      mockMode,
      addTasks,
      updateTask,
      addTimelineItem,
      addDocument,
      addHandover,
      updateRecipient,
      resetDemo,
      memberName,
      memberIdByName,
      updateMemberPreferences
    }),
    [addDocument, addHandover, addTasks, addTimelineItem, data, memberIdByName, memberName, mockMode, resetDemo, updateMemberPreferences, updateRecipient, updateTask]
  );

  if (!data && needsOnboarding && auth.profile?.mode === "supabase") {
    return (
      <LiveOnboarding
        caregiverName={auth.profile.name}
        error={liveError}
        onCreated={completeLiveOnboarding}
      />
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <Image
            src="/tandem-mark.png"
            alt="Tandem logo"
            width={48}
            height={48}
            className="mx-auto size-12 rounded-2xl object-contain"
            priority
          />
          <div className="mt-4 text-lg font-bold">Opening Tandem</div>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Getting your family care space ready.</p>
        </div>
      </div>
    );
  }

  return <CareDataContext.Provider value={value}>{children}</CareDataContext.Provider>;
}

function LiveOnboarding({
  caregiverName,
  error,
  onCreated
}: {
  caregiverName: string;
  error: string | null;
  onCreated: (data: AppData) => void;
}) {
  const [name, setName] = React.useState("");
  const [age, setAge] = React.useState("");
  const [relationship, setRelationship] = React.useState("Mother");
  const [country, setCountry] = React.useState("Singapore");
  const [context, setContext] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [inviteEmails, setInviteEmails] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const token = await readSupabaseAccessToken();
      if (!token) throw new Error("Missing Supabase session. Sign out and sign in again.");

      const response = await fetch("/api/data/live", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipient: {
            name: name.trim(),
            age: Number(age) || 0,
            relationship,
            country,
            context: context.trim(),
            address: address.trim()
          },
          inviteEmails: inviteEmails
            .split(/[,\n]/)
            .map((email) => email.trim())
            .filter(Boolean)
        })
      });
      const payload = (await response.json()) as { data?: AppData; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not create care space");
      }
      onCreated(payload.data);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not create care space");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-primary/5 px-5 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header className="pt-4">
          <div className="flex items-center gap-3">
            <Image
              src="/tandem-mark.png"
              alt="Tandem logo"
              width={48}
              height={48}
              className="size-12 rounded-2xl object-contain"
              priority
            />
            <div>
              <div className="text-2xl font-bold">Tandem</div>
              <div className="text-sm text-muted-foreground">Care Moves Better in Tandem</div>
            </div>
          </div>
          <div className="mt-10">
            <HeartPulse className="size-10 text-primary" />
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-normal">
              Start a care space for your family.
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Hi {caregiverName}. Start with the person you care for. You can bring in the rest of the family after.
            </p>
          </div>
        </header>

        <form className="space-y-4 rounded-3xl border bg-white/80 p-4 shadow-sm" onSubmit={submit}>
          <div className="flex items-center gap-2 text-sm font-bold">
            <UserPlus className="size-4 text-primary" />
            Loved one
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Who are you caring for?" required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age</span>
              <Input value={age} onChange={(event) => setAge(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="78" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relationship</span>
              <Input value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="Mother" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</span>
            <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Singapore" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Care context</span>
            <Textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="Recent fall, dementia, rehab follow-up..." />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address or area</span>
            <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Toa Payoh, Singapore" />
          </label>

          <div className="rounded-2xl border bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Mail className="size-4 text-primary" />
              Invite caregivers
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Add family emails now so this care space is ready to share when invites are enabled.
            </p>
            <Textarea
              className="mt-3"
              value={inviteEmails}
              onChange={(event) => setInviteEmails(event.target.value)}
              placeholder="sibling@example.com, helper@example.com"
            />
          </div>

          {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</p> : null}
          {message ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{message}</p> : null}

          <Button type="submit" className="w-full" disabled={!name.trim() || submitting}>
            {submitting ? "Creating care space" : "Create care space"}
          </Button>
        </form>
      </div>
    </main>
  );
}

export function useCareData() {
  const value = React.useContext(CareDataContext);
  if (!value) {
    throw new Error("useCareData must be used inside CareDataProvider");
  }

  return value;
}
