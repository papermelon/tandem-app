"use client";

import * as React from "react";

import { mockCaregiver, mockPatients } from "@/lib/home-mock-data";
import type { CaregiverProfile, CareRecipient } from "@/lib/types";

export const HOME_STORAGE_KEY = "tandem-home-state-v1";

export type Account = {
  name: string;
  language?: string;
  createdAt: string;
};

export type HomeState = {
  caregiver: CaregiverProfile;
  patients: CareRecipient[];
  selectedPatientId?: string;
  hasEntered?: boolean;
  hasBegunCare?: boolean;
  accounts?: Account[];
};

const defaultState: HomeState = {
  caregiver: mockCaregiver,
  patients: mockPatients,
  selectedPatientId: mockPatients[0]?.id,
  hasEntered: false,
  hasBegunCare: false,
  accounts: [],
};

function normalizePatient(patient: CareRecipient): CareRecipient {
  if (patient.careProfile) return patient;

  const seeded = mockPatients.find(
    (mock) => mock.id === patient.id || mock.name.toLowerCase() === patient.name.toLowerCase(),
  );

  return seeded?.careProfile ? { ...patient, careProfile: seeded.careProfile } : patient;
}

function normalizeState(state: HomeState): HomeState {
  return {
    ...state,
    patients: state.patients.map(normalizePatient),
  };
}

export function createExistingDemoHomeState(caregiverName: string): HomeState {
  return {
    caregiver: { ...mockCaregiver, name: caregiverName },
    patients: mockPatients,
    selectedPatientId: mockPatients[0]?.id,
  };
}

export function createFreshHomeState(caregiverName: string): HomeState {
  return {
    caregiver: {
      ...mockCaregiver,
      id: "caregiver-new",
      name: caregiverName,
    },
    patients: [],
    selectedPatientId: undefined,
  };
}

export function writeHomeStateSnapshot(state: HomeState) {
  if (typeof window === "undefined") return;
  write(state);
}

function read(): HomeState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(HOME_STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as HomeState;
    if (!parsed.caregiver || !Array.isArray(parsed.patients)) return defaultState;
    return normalizeState(parsed);
  } catch {
    return defaultState;
  }
}

function write(state: HomeState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort; localStorage may be disabled in private mode
  }
}

export function useHomeState() {
  const [state, setState] = React.useState<HomeState>(defaultState);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const initial = read();
    // Backfill: if there's a caregiver name from a prior session but no account record for them,
    // register them so the splash can recognise them as a returning user.
    const accounts = initial.accounts ?? [];
    const name = initial.caregiver?.name?.trim();
    if (name && !accounts.some((account) => account.name.toLowerCase() === name.toLowerCase())) {
      initial.accounts = [
        ...accounts,
        { name, language: initial.caregiver.language, createdAt: new Date().toISOString() },
      ];
    }
    setState(initial);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    write(state);
  }, [state, hydrated]);

  const setCaregiverName = React.useCallback((name: string) => {
    setState((s) => ({ ...s, caregiver: { ...s.caregiver, name } }));
  }, []);

  const setCaregiverLanguage = React.useCallback((language: string) => {
    setState((s) => ({ ...s, caregiver: { ...s.caregiver, language } }));
  }, []);

  const addPatient = React.useCallback(
    (
      draft: Pick<
        CareRecipient,
        "name" | "age" | "relationship" | "country" | "avatar" | "language" | "emergencyContacts"
      >,
    ) => {
      const id = `recipient-${Date.now()}`;
      const patient: CareRecipient = {
        id,
        name: draft.name,
        age: draft.age ?? 0,
        relationship: draft.relationship,
        country: draft.country,
        avatar: draft.avatar,
        language: draft.language,
        emergencyContacts: draft.emergencyContacts,
        context: "",
        address: "",
        careCircleId: state.caregiver.circleId,
      };
      setState((s) => ({
        ...s,
        patients: [...s.patients, patient],
        selectedPatientId: id,
      }));
      return patient;
    },
    [state.caregiver.circleId],
  );

  const importPatient = React.useCallback((patient: CareRecipient) => {
    setState((s) => {
      if (s.patients.some((p) => p.id === patient.id)) {
        return { ...s, selectedPatientId: patient.id };
      }
      return {
        ...s,
        patients: [...s.patients, patient],
        selectedPatientId: patient.id,
      };
    });
  }, []);

  const updatePatient = React.useCallback(
    (id: string, patch: Partial<CareRecipient>) => {
      setState((s) => ({
        ...s,
        patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    [],
  );

  const removePatient = React.useCallback((id: string) => {
    setState((s) => {
      const patients = s.patients.filter((p) => p.id !== id);
      const selectedPatientId = s.selectedPatientId === id ? patients[0]?.id : s.selectedPatientId;

      return {
        ...s,
        patients,
        selectedPatientId,
      };
    });
  }, []);

  const selectPatient = React.useCallback((id: string) => {
    setState((s) => ({ ...s, selectedPatientId: id }));
  }, []);

  const findAccount = React.useCallback(
    (rawName: string) => {
      const name = rawName.trim().toLowerCase();
      if (!name) return null;
      return (state.accounts ?? []).find((account) => account.name.toLowerCase() === name) ?? null;
    },
    [state.accounts],
  );

  const signInOrCreate = React.useCallback(
    (rawName: string): { isNew: boolean; name: string } | null => {
      const name = rawName.trim();
      if (!name) return null;
      const accounts = state.accounts ?? [];
      const existing = accounts.find((account) => account.name.toLowerCase() === name.toLowerCase());
      const isNew = !existing;
      const account: Account = existing ?? { name, createdAt: new Date().toISOString() };
      setState((s) => ({
        ...s,
        caregiver: {
          ...s.caregiver,
          name: account.name,
          language: account.language ?? s.caregiver.language,
        },
        accounts: existing ? s.accounts ?? [] : [...(s.accounts ?? []), account],
        hasEntered: true,
      }));
      return { isNew, name: account.name };
    },
    [state.accounts],
  );

  const markEntered = React.useCallback(() => {
    setState((s) => (s.hasEntered ? s : { ...s, hasEntered: true }));
  }, []);

  const unmarkEntered = React.useCallback(() => {
    setState((s) => (!s.hasEntered ? s : { ...s, hasEntered: false, hasBegunCare: false }));
  }, []);

  const setHasBegunCare = React.useCallback((value: boolean) => {
    setState((s) => (s.hasBegunCare === value ? s : { ...s, hasBegunCare: value }));
  }, []);

  const resetHome = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(HOME_STORAGE_KEY);
    }
    setState(defaultState);
  }, []);

  return {
    state,
    hydrated,
    setCaregiverName,
    setCaregiverLanguage,
    addPatient,
    importPatient,
    updatePatient,
    removePatient,
    selectPatient,
    findAccount,
    signInOrCreate,
    markEntered,
    unmarkEntered,
    setHasBegunCare,
    resetHome,
  };
}
