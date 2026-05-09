"use client";

import * as React from "react";

import { createSeedData } from "@/lib/seed-data";
import type { AppData, DocumentRecord, Handover, Task, TimelineItem } from "@/lib/types";

type CareDataContextValue = AppData & {
  mockMode: boolean;
  addTasks: (tasks: Omit<Task, "id">[]) => Task[];
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  addTimelineItem: (item: Omit<TimelineItem, "id" | "timestamp"> & { timestamp?: string }) => TimelineItem;
  addDocument: (document: Omit<DocumentRecord, "id" | "uploadedAt"> & { uploadedAt?: string }) => DocumentRecord;
  addHandover: (handover: Omit<Handover, "id" | "createdAt"> & { createdAt?: string }) => Handover;
  resetDemo: () => void;
  memberName: (id?: string) => string;
  memberIdByName: (name?: string) => string | undefined;
};

const STORAGE_KEY = "tandem-demo-state-v1";
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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppData) : null;
  } catch {
    return null;
  }
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
  const [data, setData] = React.useState<AppData | null>(null);
  const [mockMode, setMockMode] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/demo-data")
      .then((response) => response.json())
      .then((payload: { data?: AppData; mockMode?: boolean }) => {
        if (payload.data) {
          setData(payload.data);
          const isMockMode = Boolean(payload.mockMode);
          setMockMode(isMockMode);
          if (!isMockMode) {
            window.localStorage.removeItem(STORAGE_KEY);
          }
          return;
        }

        const storedState = readStoredState();
        if (storedState) {
          setData(storedState);
          setMockMode(true);
        }
      })
      .catch(() => {
        setData(readStoredState() ?? createSeedData());
        setMockMode(true);
      });
  }, []);

  React.useEffect(() => {
    if (!data || !mockMode) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

  const resetDemo = React.useCallback(() => {
    const seed = createSeedData();
    window.localStorage.removeItem(STORAGE_KEY);
    setData(seed);
    setMockMode(true);
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
      resetDemo,
      memberName,
      memberIdByName
    }),
    [addDocument, addHandover, addTasks, addTimelineItem, data, memberIdByName, memberName, mockMode, resetDemo, updateTask]
  );

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            T
          </div>
          <div className="mt-4 text-lg font-bold">Loading Tandem</div>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Preparing Mum care circle.</p>
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
