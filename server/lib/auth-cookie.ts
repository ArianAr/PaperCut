import { createHmac, timingSafeEqual } from "node:crypto";
import { getCookieSecure, getPasteAuthSecret } from "./env";

const COOKIE_PREFIX = "pc_auth_";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function authCookieName(pasteId: string): string {
  return `${COOKIE_PREFIX}${pasteId}`;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Build a signed unlock token: `pasteId.exp.sig`
 */
export function createUnlockToken(
  pasteId: string,
  options?: { now?: number; ttlMs?: number; secret?: string },
): string {
  const now = options?.now ?? Date.now();
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const secret = options?.secret ?? getPasteAuthSecret();
  const exp = now + ttlMs;
  const payload = `${pasteId}.${exp}`;
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

export function verifyUnlockToken(
  pasteId: string,
  token: string | undefined,
  options?: { now?: number; secret?: string },
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [id, expStr, sig] = parts as [string, string, string];
  if (id !== pasteId) return false;

  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp)) return false;

  const now = options?.now ?? Date.now();
  if (now > exp) return false;

  const secret = options?.secret ?? getPasteAuthSecret();
  const payload = `${id}.${expStr}`;
  const expected = sign(payload, secret);

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function unlockCookieOptions(maxAgeSeconds = 24 * 60 * 60) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getCookieSecure(),
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
