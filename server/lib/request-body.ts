/**
 * Bounded request body readers (DoS protection).
 * Prefer these over unbounded request.json() / request.text().
 */

export type ReadBodyResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string };

/**
 * Read the request body as UTF-8 text, aborting once `maxBytes` is exceeded.
 * Honors Content-Length when present for an early 413.
 */
export async function readBodyWithLimit(
  request: Request,
  maxBytes: number,
  options?: { exceedMessage?: string },
): Promise<ReadBodyResult> {
  const exceedMessage =
    options?.exceedMessage ??
    `request body exceeds maximum size of ${maxBytes} bytes`;

  const cl = request.headers.get("content-length");
  if (cl) {
    const n = Number.parseInt(cl, 10);
    if (Number.isFinite(n) && n > maxBytes) {
      return { ok: false, status: 413, error: exceedMessage };
    }
  }

  if (!request.body) {
    return { ok: true, text: "" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      return { ok: false, status: 413, error: exceedMessage };
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return { ok: true, text: new TextDecoder("utf-8").decode(merged) };
}

/**
 * Read a JSON body with a hard byte limit, then JSON.parse.
 */
export async function readJsonBodyWithLimit<T = unknown>(
  request: Request,
  maxBytes: number,
  options?: { exceedMessage?: string },
): Promise<
  | { ok: true; value: T }
  | { ok: false; status: number; error: string }
> {
  const raw = await readBodyWithLimit(request, maxBytes, options);
  if (!raw.ok) return raw;
  if (!raw.text.trim()) {
    return { ok: false, status: 400, error: "Invalid JSON body" };
  }
  try {
    return { ok: true, value: JSON.parse(raw.text) as T };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body" };
  }
}

/** Extra allowance for JSON wrapper keys around paste content. */
export const JSON_CREATE_OVERHEAD_BYTES = 16_384;

/** Unlock body is only `{ password }` — keep small. */
export const UNLOCK_MAX_BODY_BYTES = 4_096;
