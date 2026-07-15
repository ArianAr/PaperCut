/**
 * Custom highlight rules (regex → color), browser-local only.
 * Never sent to the server.
 */

import { ansiToHtml } from "./ansi-html";

export const HIGHLIGHT_RULES_STORAGE_KEY = "papercut-highlight-rules";
export const MAX_HIGHLIGHT_RULES = 20;
export const MAX_PATTERN_LENGTH = 200;

export type HighlightColorId =
  | "error"
  | "warn"
  | "info"
  | "accent"
  | "success"
  | "debug";

export const HIGHLIGHT_COLOR_OPTIONS: ReadonlyArray<{
  id: HighlightColorId;
  label: string;
  /** Tailwind classes for <mark> spans */
  markClass: string;
  /** Swatch for UI */
  swatchClass: string;
}> = [
  {
    id: "error",
    label: "Error",
    markClass: "rounded-sm bg-vscode-error/45 text-vscode-fg",
    swatchClass: "bg-vscode-error",
  },
  {
    id: "warn",
    label: "Warn",
    markClass: "rounded-sm bg-vscode-warn/45 text-vscode-fg",
    swatchClass: "bg-vscode-warn",
  },
  {
    id: "info",
    label: "Info",
    markClass: "rounded-sm bg-vscode-info/40 text-vscode-fg",
    swatchClass: "bg-vscode-info",
  },
  {
    id: "accent",
    label: "Accent",
    markClass: "rounded-sm bg-vscode-accent/40 text-vscode-fg",
    swatchClass: "bg-vscode-accent",
  },
  {
    id: "success",
    label: "Success",
    markClass: "rounded-sm bg-vscode-success/40 text-vscode-fg",
    swatchClass: "bg-vscode-success",
  },
  {
    id: "debug",
    label: "Debug",
    markClass: "rounded-sm bg-vscode-debug/40 text-vscode-fg",
    swatchClass: "bg-vscode-debug",
  },
];

const COLOR_SET = new Set(HIGHLIGHT_COLOR_OPTIONS.map((c) => c.id));

export function isHighlightColorId(value: unknown): value is HighlightColorId {
  return typeof value === "string" && COLOR_SET.has(value as HighlightColorId);
}

export function markClassForColor(color: HighlightColorId): string {
  return (
    HIGHLIGHT_COLOR_OPTIONS.find((c) => c.id === color)?.markClass ??
    HIGHLIGHT_COLOR_OPTIONS[0]!.markClass
  );
}

export interface HighlightRule {
  id: string;
  /** Regex source (not delimited) */
  pattern: string;
  /** Regex flags; only gimsuy allowed; `g` forced at compile time */
  flags: string;
  color: HighlightColorId;
  enabled: boolean;
}

export interface CompiledHighlightRule {
  id: string;
  regex: RegExp;
  color: HighlightColorId;
  markClass: string;
}

/** Sanitize user flags; always ensure global for multi-match. */
export function sanitizeHighlightFlags(raw: string | undefined): string {
  const cleaned = (raw ?? "i").toLowerCase().replace(/[^gimsuy]/g, "");
  // Prefer case-insensitive default when empty / only global after clean
  let flags = cleaned;
  if (!flags || flags === "g") {
    flags = flags === "g" ? "ig" : "i";
  }
  if (!flags.includes("g")) flags += "g";
  return flags;
}

export function newHighlightRuleId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `hl-${crypto.randomUUID()}`;
  }
  return `hl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createHighlightRule(
  input: {
    pattern: string;
    flags?: string;
    color?: HighlightColorId;
    enabled?: boolean;
    id?: string;
  },
): HighlightRule {
  return {
    id: input.id ?? newHighlightRuleId(),
    pattern: input.pattern.slice(0, MAX_PATTERN_LENGTH),
    flags: sanitizeHighlightFlags(input.flags),
    color: isHighlightColorId(input.color) ? input.color : "accent",
    enabled: input.enabled !== false,
  };
}

export function normalizeHighlightRules(
  rules: readonly HighlightRule[],
): HighlightRule[] {
  const out: HighlightRule[] = [];
  const seen = new Set<string>();
  for (const r of rules) {
    if (!r || typeof r.pattern !== "string") continue;
    const id =
      typeof r.id === "string" && r.id.length > 0 ? r.id : newHighlightRuleId();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(
      createHighlightRule({
        id,
        pattern: r.pattern,
        flags: r.flags,
        color: r.color,
        enabled: r.enabled !== false,
      }),
    );
    if (out.length >= MAX_HIGHLIGHT_RULES) break;
  }
  return out;
}

export function compileHighlightRules(
  rules: readonly HighlightRule[],
): CompiledHighlightRule[] {
  const compiled: CompiledHighlightRule[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const pattern = rule.pattern.trim();
    if (!pattern) continue;
    try {
      const flags = sanitizeHighlightFlags(rule.flags);
      compiled.push({
        id: rule.id,
        regex: new RegExp(pattern, flags),
        color: rule.color,
        markClass: markClassForColor(rule.color),
      });
    } catch {
      // Invalid pattern — skip (UI should surface validation)
    }
  }
  return compiled;
}

/** Validate a draft pattern without throwing. */
export function validateHighlightPattern(
  pattern: string,
  flags?: string,
): { ok: true } | { ok: false; error: string } {
  const trimmed = pattern.trim();
  if (!trimmed) return { ok: false, error: "Pattern is required" };
  if (trimmed.length > MAX_PATTERN_LENGTH) {
    return { ok: false, error: `Pattern max ${MAX_PATTERN_LENGTH} chars` };
  }
  try {
    void new RegExp(trimmed, sanitizeHighlightFlags(flags));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid regex",
    };
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface MatchSpan {
  start: number;
  end: number;
  markClass: string;
  ruleOrder: number;
}

/**
 * Apply non-overlapping highlights (earlier rules win on overlap).
 * Returns HTML with escaped text + <mark> spans.
 */
export function highlightPlainText(
  plain: string,
  rules: readonly CompiledHighlightRule[],
): { html: string; matched: boolean } {
  if (rules.length === 0 || plain.length === 0) {
    return { html: escapeHtml(plain), matched: false };
  }

  const spans: MatchSpan[] = [];
  rules.forEach((rule, ruleOrder) => {
    rule.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = rule.regex.exec(plain)) !== null) {
      guard += 1;
      if (guard > 10_000) break; // pathological pattern safety
      const start = m.index;
      const end = start + m[0].length;
      if (end > start) {
        spans.push({ start, end, markClass: rule.markClass, ruleOrder });
      }
      // Avoid zero-length infinite loops
      if (m[0].length === 0) {
        rule.regex.lastIndex = start + 1;
        if (rule.regex.lastIndex > plain.length) break;
      }
    }
  });

  if (spans.length === 0) {
    return { html: escapeHtml(plain), matched: false };
  }

  spans.sort((a, b) => a.start - b.start || a.ruleOrder - b.ruleOrder || a.end - b.end);

  const chosen: MatchSpan[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    chosen.push(span);
    cursor = span.end;
  }

  let html = "";
  let i = 0;
  for (const span of chosen) {
    if (span.start > i) {
      html += escapeHtml(plain.slice(i, span.start));
    }
    html += `<mark class="${span.markClass}">${escapeHtml(plain.slice(span.start, span.end))}</mark>`;
    i = span.end;
  }
  if (i < plain.length) {
    html += escapeHtml(plain.slice(i));
  }
  return { html, matched: true };
}

/**
 * Prefer ANSI HTML when no custom rule matches the line;
 * otherwise plain text with <mark> highlights (ANSI dropped for that line).
 */
export function renderLineHtml(
  raw: string,
  plain: string,
  rules: readonly CompiledHighlightRule[],
): string {
  if (rules.length === 0) return ansiToHtml(raw);
  const { html, matched } = highlightPlainText(plain, rules);
  if (!matched) return ansiToHtml(raw);
  return html;
}

export function readStoredHighlightRules(): HighlightRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIGHLIGHT_RULES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeHighlightRules(parsed as HighlightRule[]);
  } catch {
    return [];
  }
}

export function persistHighlightRules(rules: readonly HighlightRule[]): void {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeHighlightRules(rules);
    if (normalized.length === 0) {
      window.localStorage.removeItem(HIGHLIGHT_RULES_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        HIGHLIGHT_RULES_STORAGE_KEY,
        JSON.stringify(normalized),
      );
    }
  } catch {
    /* private mode / blocked storage */
  }
}
