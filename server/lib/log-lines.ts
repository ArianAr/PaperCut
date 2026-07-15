import {
  detectLogLevel,
  stripAnsi,
  type LogLevel,
} from "./metadata";

export type { LogLevel };

export interface ParsedLogLine {
  /** 0-based index in the original paste */
  index: number;
  /** 1-based line number for display / deep links */
  lineNumber: number;
  raw: string;
  plain: string;
  level: LogLevel;
  isJson: boolean;
  jsonValue: unknown | null;
}

export type LevelFilterState = Record<LogLevel, boolean>;

export function splitRawLines(rawContent: string): string[] {
  if (rawContent.length === 0) return [];
  const lines = rawContent.split("\n");
  return rawContent.endsWith("\n") ? lines.slice(0, -1) : lines;
}

export function tryParseJson(plain: string): { ok: true; value: unknown } | { ok: false } {
  const trimmed = plain.trim();
  if (!trimmed || !(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return { ok: false };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    return { ok: false };
  }
}

export function parseLogLines(rawContent: string): ParsedLogLine[] {
  const rawLines = splitRawLines(rawContent);
  return rawLines.map((raw, index) => {
    const plain = stripAnsi(raw);
    const json = tryParseJson(plain);
    return {
      index,
      lineNumber: index + 1,
      raw,
      plain,
      level: detectLogLevel(raw),
      isJson: json.ok,
      jsonValue: json.ok ? json.value : null,
    };
  });
}

export function defaultLevelFilters(): LevelFilterState {
  return {
    TRACE: true,
    DEBUG: true,
    INFO: true,
    WARN: true,
    ERROR: true,
    FATAL: true,
    UNKNOWN: true,
  };
}

export type SearchMode = "plain" | "regex";

export interface SearchQuery {
  raw: string;
  mode: SearchMode;
  /** Compiled regex when mode is regex and pattern is valid */
  regex: RegExp | null;
  /** Invalid regex error message */
  error: string | null;
}

/**
 * Parse search box input.
 * `/pattern/flags` enables regex mode; otherwise substring match (case-insensitive).
 */
export function parseSearchQuery(input: string): SearchQuery {
  const raw = input;
  const trimmed = input.trim();
  if (!trimmed) {
    return { raw, mode: "plain", regex: null, error: null };
  }

  if (trimmed.startsWith("/") && trimmed.length >= 2) {
    const lastSlash = trimmed.lastIndexOf("/");
    if (lastSlash > 0) {
      const pattern = trimmed.slice(1, lastSlash);
      const flags = trimmed.slice(lastSlash + 1) || "i";
      try {
        // Disallow dangerous flags like nested; only allow gimsu
        if (!/^[gimsuy]*$/.test(flags)) {
          return {
            raw,
            mode: "regex",
            regex: null,
            error: "Invalid regex flags",
          };
        }
        return {
          raw,
          mode: "regex",
          regex: new RegExp(pattern, flags.includes("g") ? flags : `${flags}`),
          error: null,
        };
      } catch (e) {
        return {
          raw,
          mode: "regex",
          regex: null,
          error: e instanceof Error ? e.message : "Invalid regex",
        };
      }
    }
  }

  return { raw, mode: "plain", regex: null, error: null };
}

export function lineMatchesSearch(line: ParsedLogLine, query: SearchQuery): boolean {
  if (!query.raw.trim()) return true;
  if (query.mode === "regex") {
    if (!query.regex) return true; // don't hide all lines on invalid regex
    query.regex.lastIndex = 0;
    return query.regex.test(line.plain);
  }
  return line.plain.toLowerCase().includes(query.raw.trim().toLowerCase());
}

export function filterLogLines(
  lines: ParsedLogLine[],
  levels: LevelFilterState,
  query: SearchQuery,
): ParsedLogLine[] {
  return lines.filter(
    (line) => levels[line.level] && lineMatchesSearch(line, query),
  );
}

/**
 * Join visible lines for download/export.
 * Uses original `raw` (keeps ANSI); no trailing newline when empty or single empty line set.
 */
export function joinLinesForExport(lines: readonly ParsedLogLine[]): string {
  if (lines.length === 0) return "";
  return lines.map((line) => line.raw).join("\n");
}

export interface LineSelection {
  start: number; // 1-based inclusive
  end: number; // 1-based inclusive
}

/**
 * Parse GitHub-style hashes: #L12, #L12-L20, #l12-l20
 */
export function parseLineHash(hash: string): LineSelection | null {
  const cleaned = hash.startsWith("#") ? hash.slice(1) : hash;
  const match = /^L(\d+)(?:-L(\d+))?$/i.exec(cleaned);
  if (!match) return null;
  let start = Number.parseInt(match[1]!, 10);
  let end = match[2] ? Number.parseInt(match[2], 10) : start;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < 1) {
    return null;
  }
  if (end < start) [start, end] = [end, start];
  return { start, end };
}

export function formatLineHash(selection: LineSelection | null): string {
  if (!selection) return "";
  if (selection.start === selection.end) return `#L${selection.start}`;
  return `#L${selection.start}-L${selection.end}`;
}

export function isLineSelected(
  lineNumber: number,
  selection: LineSelection | null,
): boolean {
  if (!selection) return false;
  return lineNumber >= selection.start && lineNumber <= selection.end;
}

export function countLevels(
  lines: ParsedLogLine[],
): Record<LogLevel, number> {
  const counts: Record<LogLevel, number> = {
    TRACE: 0,
    DEBUG: 0,
    INFO: 0,
    WARN: 0,
    ERROR: 0,
    FATAL: 0,
    UNKNOWN: 0,
  };
  for (const line of lines) {
    counts[line.level] += 1;
  }
  return counts;
}
