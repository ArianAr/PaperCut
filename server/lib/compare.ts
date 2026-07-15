/** Helpers for multi-paste compare (client-side). */

const ID_RE = /^[A-Za-z0-9_-]{6,64}$/;

export function isValidPasteId(id: string): boolean {
  return ID_RE.test(id.trim());
}

export function normalizeCompareId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const id = raw.trim();
  if (!isValidPasteId(id)) return null;
  return id;
}

export function buildCompareSearch(
  currentSearch: string,
  compareId: string | null,
): string {
  const params = new URLSearchParams(
    currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch,
  );
  if (compareId) params.set("compare", compareId);
  else params.delete("compare");
  const s = params.toString();
  return s ? `?${s}` : "";
}

export type CompareFetchResult =
  | {
      ok: true;
      id: string;
      rawContent: string;
      createdAt: number;
      expiresAt: number | null;
    }
  | { ok: false; status: number; error: string; locked?: boolean };

/**
 * Parse JSON body from GET /api/pastes/:id for compare pane.
 * Pure helper for tests; browser uses fetch + this parser.
 */
export function parseComparePasteResponse(
  status: number,
  body: unknown,
  expectedId: string,
): CompareFetchResult {
  if (status === 401) {
    return {
      ok: false,
      status,
      error: "Second paste is password-protected. Unlock it in another tab first.",
      locked: true,
    };
  }
  if (status === 404) {
    return { ok: false, status, error: "Second paste not found or expired." };
  }
  if (status < 200 || status >= 300) {
    return {
      ok: false,
      status,
      error: `Failed to load second paste (HTTP ${status}).`,
    };
  }
  if (!body || typeof body !== "object") {
    return { ok: false, status, error: "Invalid response for second paste." };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.rawContent !== "string") {
    return { ok: false, status, error: "Invalid response for second paste." };
  }
  return {
    ok: true,
    id: typeof b.id === "string" ? b.id : expectedId,
    rawContent: b.rawContent,
    createdAt: typeof b.createdAt === "number" ? b.createdAt : 0,
    expiresAt: typeof b.expiresAt === "number" ? b.expiresAt : null,
  };
}
