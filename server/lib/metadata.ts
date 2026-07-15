export type LogLevel =
  | "TRACE"
  | "DEBUG"
  | "INFO"
  | "WARN"
  | "ERROR"
  | "FATAL"
  | "UNKNOWN";

export interface PasteMetadata {
  lineCount: number;
  levels: Record<LogLevel, number>;
  hasJsonLines: boolean;
  byteLength: number;
}

const LEVELS: Array<Exclude<LogLevel, "UNKNOWN">> = [
  "FATAL",
  "ERROR",
  "WARN",
  "INFO",
  "DEBUG",
  "TRACE",
];

// Prefer explicit [LEVEL] tokens; bare LEVEL only near the start of a line
// (after optional timestamp noise) to avoid matching JSON values like {"level":"info"}.
const BRACKETED_LEVEL_RE =
  /\[(FATAL|ERROR|WARN(?:ING)?|INFO|DEBUG|TRACE)\]/i;
const LEADING_LEVEL_RE =
  /^\s*(?:[\d\-T:.Z]+\s+)?(?:\[)?(FATAL|ERROR|WARN(?:ING)?|INFO|DEBUG|TRACE)(?:\])?\b/i;

/** Strip common ANSI CSI / OSC sequences for metadata and search. */
export function stripAnsi(input: string): string {
  return input
    .replace(/\u001b\][\s\S]*?(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b[@-Z\\-_]/g, "");
}

function normalizeLevel(raw: string): Exclude<LogLevel, "UNKNOWN"> {
  const upper = raw.toUpperCase();
  if (upper === "WARNING") return "WARN";
  return upper as Exclude<LogLevel, "UNKNOWN">;
}

export function detectLogLevel(line: string): LogLevel {
  const plain = stripAnsi(line);
  const bracketed = BRACKETED_LEVEL_RE.exec(plain);
  if (bracketed?.[1]) {
    return normalizeLevel(bracketed[1]);
  }
  const leading = LEADING_LEVEL_RE.exec(plain);
  if (leading?.[1]) {
    return normalizeLevel(leading[1]);
  }
  // Keep LEVELS referenced for exhaustiveness / future priority tweaks
  void LEVELS;
  return "UNKNOWN";
}

export function looksLikeJsonLine(line: string): boolean {
  const plain = stripAnsi(line).trim();
  if (!plain) return false;
  if (!(plain.startsWith("{") || plain.startsWith("["))) return false;
  try {
    JSON.parse(plain);
    return true;
  } catch {
    return false;
  }
}

export function emptyLevels(): Record<LogLevel, number> {
  return {
    TRACE: 0,
    DEBUG: 0,
    INFO: 0,
    WARN: 0,
    ERROR: 0,
    FATAL: 0,
    UNKNOWN: 0,
  };
}

/**
 * Scan raw paste content and produce summary metadata.
 * Line count treats a trailing newline as terminator (not an extra empty line).
 */
export function computeMetadata(rawContent: string): PasteMetadata {
  const lines = rawContent.split("\n");
  const effectiveLines =
    rawContent.length === 0
      ? []
      : rawContent.endsWith("\n")
        ? lines.slice(0, -1)
        : lines;

  const levels = emptyLevels();
  let hasJsonLines = false;

  for (const line of effectiveLines) {
    levels[detectLogLevel(line)] += 1;
    if (!hasJsonLines && looksLikeJsonLine(line)) {
      hasJsonLines = true;
    }
  }

  return {
    lineCount: effectiveLines.length,
    levels,
    hasJsonLines,
    byteLength: Buffer.byteLength(rawContent, "utf8"),
  };
}

export function serializeMetadata(meta: PasteMetadata): string {
  return JSON.stringify(meta);
}

export function parseMetadata(json: string): PasteMetadata {
  return JSON.parse(json) as PasteMetadata;
}
