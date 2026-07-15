/**
 * Extract timestamps from log lines for the canvas timeline scrubber.
 */

import type { ParsedLogLine } from "./log-lines";

export interface TimelinePoint {
  lineNumber: number;
  /** Epoch ms */
  timeMs: number;
}

export interface TimelineIndex {
  points: TimelinePoint[];
  minMs: number;
  maxMs: number;
}

// ISO-like with optional fractional seconds and timezone
const ISO_RE =
  /\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:?\d{2})?)\b/;

// Date + time without T: 2024-01-15 12:34:56
const DATE_SPACE_RE =
  /\b(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,9})?)\b/;

// Syslog-style: Jan  2 15:04:05 (no year)
const SYSLOG_RE =
  /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\b/i;

// Unix epoch seconds or ms (10 or 13 digits) near start
const EPOCH_RE = /(?:^|[\s\[])(\d{10}|\d{13})(?:\b|[\s\].])/;

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseIsoLike(raw: string): number | null {
  // Normalize space to T for Date.parse when no timezone
  let s = raw.includes("T") ? raw : raw.replace(" ", "T");
  // If no timezone, treat as UTC for stability across locales
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    s = `${s}Z`;
  }
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

function parseSyslog(raw: string, year: number): number | null {
  const m =
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})$/i.exec(
      raw.trim(),
    );
  if (!m) return null;
  const month = MONTHS[m[1]!.toLowerCase()];
  if (month === undefined) return null;
  const day = Number.parseInt(m[2]!, 10);
  const hh = Number.parseInt(m[3]!, 10);
  const mm = Number.parseInt(m[4]!, 10);
  const ss = Number.parseInt(m[5]!, 10);
  const ms = Date.UTC(year, month, day, hh, mm, ss);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Best-effort timestamp extraction from a single plain log line.
 * `fallbackYear` is used for syslog lines without a year.
 */
export function extractTimestampMs(
  plain: string,
  fallbackYear = 2024,
): number | null {
  if (!plain) return null;

  const iso = ISO_RE.exec(plain);
  if (iso?.[1]) {
    const ms = parseIsoLike(iso[1]);
    if (ms != null) return ms;
  }

  const spaced = DATE_SPACE_RE.exec(plain);
  if (spaced?.[1]) {
    const ms = parseIsoLike(spaced[1]);
    if (ms != null) return ms;
  }

  const epoch = EPOCH_RE.exec(plain);
  if (epoch?.[1]) {
    const n = Number.parseInt(epoch[1], 10);
    if (epoch[1].length === 13) return n;
    if (epoch[1].length === 10) return n * 1000;
  }

  const syslog = SYSLOG_RE.exec(plain);
  if (syslog?.[1]) {
    return parseSyslog(syslog[1], fallbackYear);
  }

  return null;
}

/**
 * Build a sorted timeline from lines that carry parseable timestamps.
 * Requires at least 2 points for a useful scrubber.
 */
export function buildTimelineIndex(
  lines: readonly ParsedLogLine[],
  options?: { fallbackYear?: number },
): TimelineIndex | null {
  const year = options?.fallbackYear ?? new Date().getUTCFullYear();
  const points: TimelinePoint[] = [];

  for (const line of lines) {
    const timeMs = extractTimestampMs(line.plain, year);
    if (timeMs == null) continue;
    points.push({ lineNumber: line.lineNumber, timeMs });
  }

  if (points.length < 2) return null;

  points.sort((a, b) => a.timeMs - b.timeMs || a.lineNumber - b.lineNumber);

  let minMs = points[0]!.timeMs;
  let maxMs = points[0]!.timeMs;
  for (const p of points) {
    if (p.timeMs < minMs) minMs = p.timeMs;
    if (p.timeMs > maxMs) maxMs = p.timeMs;
  }

  if (minMs === maxMs) return null;

  return { points, minMs, maxMs };
}

/** Nearest timeline point to `timeMs` (binary search). */
export function nearestTimelinePoint(
  index: TimelineIndex,
  timeMs: number,
): TimelinePoint {
  const { points } = index;
  let lo = 0;
  let hi = points.length - 1;
  if (timeMs <= points[0]!.timeMs) return points[0]!;
  if (timeMs >= points[hi]!.timeMs) return points[hi]!;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = points[mid]!.timeMs;
    if (t === timeMs) return points[mid]!;
    if (t < timeMs) lo = mid + 1;
    else hi = mid - 1;
  }
  // lo is first > timeMs; hi is last < timeMs
  const a = points[Math.max(0, hi)]!;
  const b = points[Math.min(points.length - 1, lo)]!;
  return Math.abs(a.timeMs - timeMs) <= Math.abs(b.timeMs - timeMs) ? a : b;
}

/** Map 0..1 scrub position to time within the index range. */
export function scrubToTimeMs(index: TimelineIndex, ratio: number): number {
  const r = Math.min(1, Math.max(0, ratio));
  return index.minMs + r * (index.maxMs - index.minMs);
}

export function formatTimelineTime(ms: number): string {
  try {
    return new Date(ms).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");
  } catch {
    return String(ms);
  }
}
