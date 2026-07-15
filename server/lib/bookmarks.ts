/**
 * Per-paste line bookmarks (local only). Never sent to the server.
 */

export function bookmarksStorageKey(pasteId: string): string {
  return `papercut-bookmarks:${pasteId}`;
}

/** Normalize: unique positive ints, sorted ascending. */
export function normalizeBookmarks(lines: Iterable<number>): number[] {
  const set = new Set<number>();
  for (const n of lines) {
    if (Number.isInteger(n) && n >= 1) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export function toggleBookmark(lines: readonly number[], lineNumber: number): number[] {
  if (!Number.isInteger(lineNumber) || lineNumber < 1) {
    return normalizeBookmarks(lines);
  }
  const set = new Set(normalizeBookmarks(lines));
  if (set.has(lineNumber)) set.delete(lineNumber);
  else set.add(lineNumber);
  return [...set].sort((a, b) => a - b);
}

export function isBookmarked(
  lines: readonly number[] | ReadonlySet<number>,
  lineNumber: number,
): boolean {
  if (lines instanceof Set) return lines.has(lineNumber);
  return (lines as readonly number[]).includes(lineNumber);
}

export function readStoredBookmarks(pasteId: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(bookmarksStorageKey(pasteId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeBookmarks(
      parsed.filter((n): n is number => typeof n === "number"),
    );
  } catch {
    return [];
  }
}

export function persistBookmarks(pasteId: string, lines: readonly number[]): void {
  if (typeof window === "undefined") return;
  try {
    const key = bookmarksStorageKey(pasteId);
    const normalized = normalizeBookmarks(lines);
    if (normalized.length === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(normalized));
    }
  } catch {
    /* private mode / blocked storage */
  }
}
