export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "papercut-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode / blocked storage */
  }
}

export function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? "dark";
}

/**
 * Inline script: set data-theme before paint (no FOUC).
 * Fully static string (no interpolation) so CodeQL js/bad-code-sanitization stays clean.
 * The localStorage key literal must stay equal to THEME_STORAGE_KEY.
 */
export const THEME_BOOT_SCRIPT =
  '(function(){try{var t=localStorage.getItem("papercut-theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();';
