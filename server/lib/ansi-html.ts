import { AnsiUp } from "ansi_up";

const cache = new Map<string, string>();
const MAX_CACHE = 5000;

/**
 * Convert a single log line's ANSI sequences to safe HTML.
 * Results are memoized for virtualized rendering.
 */
export function ansiToHtml(rawLine: string): string {
  const hit = cache.get(rawLine);
  if (hit !== undefined) return hit;

  const converter = getConverter();
  const html = converter.ansi_to_html(rawLine);

  if (cache.size >= MAX_CACHE) {
    // Drop oldest-ish entries cheaply
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(rawLine, html);
  return html;
}

let shared: AnsiUp | null = null;

function getConverter(): AnsiUp {
  if (!shared) {
    shared = new AnsiUp();
    // Escape HTML entities — important for untrusted paste content
    shared.escape_html = true;
  }
  return shared;
}

/** Test helper */
export function clearAnsiCache(): void {
  cache.clear();
}
