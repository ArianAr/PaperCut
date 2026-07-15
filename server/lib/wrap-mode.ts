export type WrapMode = "wrap" | "nowrap";

export const WRAP_MODE_STORAGE_KEY = "papercut-wrap-mode";

export function isWrapMode(value: unknown): value is WrapMode {
  return value === "wrap" || value === "nowrap";
}

export function readStoredWrapMode(): WrapMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WRAP_MODE_STORAGE_KEY);
    return isWrapMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function persistWrapMode(mode: WrapMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WRAP_MODE_STORAGE_KEY, mode);
  } catch {
    /* private mode / blocked storage */
  }
}

/** Soft-wrap is the default (matches previous canvas behavior). */
export function resolveInitialWrapMode(): WrapMode {
  return readStoredWrapMode() ?? "wrap";
}
