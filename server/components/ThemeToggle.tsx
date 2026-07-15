"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  persistTheme,
  resolveInitialTheme,
  type Theme,
} from "@/lib/theme";

interface ThemeToggleProps {
  className?: string;
  /** Compact label for toolbars */
  compact?: boolean;
}

export function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(resolveInitialTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    persistTheme(next);
  }

  const label =
    theme === "dark"
      ? compact
        ? "Light"
        : "Switch to light theme"
      : compact
        ? "Dark"
        : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      className={
        className ||
        "rounded border border-vscode-border bg-vscode-line px-2 py-1 font-mono text-xs text-vscode-fg hover:border-vscode-accent"
      }
      aria-label={label}
      title={label}
    >
      {!mounted ? (
        <span className="text-vscode-muted">Theme</span>
      ) : theme === "dark" ? (
        <span>{compact ? "☀ Light" : "☀ Light theme"}</span>
      ) : (
        <span>{compact ? "☾ Dark" : "☾ Dark theme"}</span>
      )}
    </button>
  );
}
