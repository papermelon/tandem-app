import type { HomeState } from "@/lib/home-state";

export type PhotoAdapter = {
  upload: (file: File) => Promise<string>;
};

export type HomeStateAdapter = {
  load: () => Promise<HomeState | null>;
  save: (state: HomeState) => Promise<void>;
};

const HOME_STORAGE_KEY = "tandem-home-state-v1";

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unexpected reader result"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });

export const inlinePhotoAdapter: PhotoAdapter = {
  upload: fileToDataUrl,
};

export const supabasePhotoAdapter: PhotoAdapter = {
  async upload(file) {
    void file;
    throw new Error("Supabase photo adapter not yet wired. Set NEXT_PUBLIC_PHOTO_STORAGE=inline for now.");
  },
};

export function getPhotoAdapter(): PhotoAdapter {
  const mode = process.env.NEXT_PUBLIC_PHOTO_STORAGE;
  return mode === "supabase" ? supabasePhotoAdapter : inlinePhotoAdapter;
}

export const localStorageHomeAdapter: HomeStateAdapter = {
  async load() {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(HOME_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as HomeState) : null;
    } catch {
      return null;
    }
  },
  async save(state) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(HOME_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // best-effort
    }
  },
};

export const supabaseHomeAdapter: HomeStateAdapter = {
  async load() {
    return null;
  },
  async save() {
    // wired alongside Supabase Auth; falls through to localStorage for the demo
  },
};

export function getHomeStateAdapter(): HomeStateAdapter {
  const mode = process.env.NEXT_PUBLIC_HOME_STATE_BACKEND;
  return mode === "supabase" ? supabaseHomeAdapter : localStorageHomeAdapter;
}
