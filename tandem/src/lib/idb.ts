import { defaultState } from "@/lib/sample-data";
import { TandemState } from "@/lib/types";

const DB_NAME = "tandem-db";
const STORE_NAME = "app-state";
const KEY = "singleton";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadState(): Promise<TandemState> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return defaultState;
  }

  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(KEY);

    request.onsuccess = () => {
      resolve((request.result as TandemState | undefined) ?? defaultState);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveState(state: TandemState): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return;
  }

  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(state, KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
