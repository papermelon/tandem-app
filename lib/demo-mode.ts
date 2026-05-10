export const FORCE_DEMO_DATA_STORAGE_KEY = "tandem-force-demo-data-v1";
export const CARE_DEMO_STORAGE_KEY = "tandem-demo-state-v1";

export function shouldForceDemoData() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(FORCE_DEMO_DATA_STORAGE_KEY) === "true";
}

export function setForceDemoData(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) {
    window.localStorage.setItem(FORCE_DEMO_DATA_STORAGE_KEY, "true");
    return;
  }
  window.localStorage.removeItem(FORCE_DEMO_DATA_STORAGE_KEY);
}

export function clearCareDemoData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CARE_DEMO_STORAGE_KEY);
}
