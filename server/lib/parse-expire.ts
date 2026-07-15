const EXPIRE_RE = /^(\d+)\s*(s|m|h|d|w)$/i;

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

export type ParseExpireResult =
  | { ok: true; expiresAt: number; durationMs: number }
  | { ok: false; error: string };

/**
 * Parse human expiry strings like `30m`, `1h`, `7d` into an absolute timestamp.
 * @param input - Duration string
 * @param now - Reference time in ms (injectable for tests)
 */
export function parseExpire(
  input: string,
  now: number = Date.now(),
): ParseExpireResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Expiry must not be empty" };
  }

  const match = EXPIRE_RE.exec(trimmed);
  if (!match) {
    return {
      ok: false,
      error: "Invalid expiry format. Use values like 30m, 1h, 1d, or 7d",
    };
  }

  const amount = Number.parseInt(match[1]!, 10);
  if (amount <= 0) {
    return { ok: false, error: "Expiry amount must be greater than zero" };
  }

  const unit = match[2]!.toLowerCase();
  const durationMs = amount * UNIT_MS[unit]!;

  // Cap at 365 days to avoid accidental permanent-looking pastes via huge numbers
  const maxMs = 365 * UNIT_MS.d!;
  if (durationMs > maxMs) {
    return { ok: false, error: "Expiry must be at most 365 days" };
  }

  return {
    ok: true,
    durationMs,
    expiresAt: now + durationMs,
  };
}
