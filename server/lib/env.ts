import path from "node:path";

const DEFAULT_MAX_PASTE_SIZE = 10 * 1024 * 1024; // 10 MiB

export function getDatabasePath(): string {
  return (
    process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "papercut.db")
  );
}

export function getMaxPasteSize(): number {
  const raw = process.env.MAX_PASTE_SIZE;
  if (!raw) return DEFAULT_MAX_PASTE_SIZE;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid MAX_PASTE_SIZE: ${raw}`);
  }
  return n;
}

export function getPublicUrl(): string | undefined {
  const url = process.env.PAPERCUT_PUBLIC_URL?.trim();
  return url ? url.replace(/\/$/, "") : undefined;
}

/** Known placeholders that must never be used as production unlock secrets. */
const WEAK_PASTE_AUTH_SECRETS = new Set([
  "change-me-in-production-use-a-long-random-string",
  "change-me-to-a-long-random-string",
  "papercut-dev-only-secret-change-me",
  "changeme",
  "secret",
  "password",
]);

const MIN_PROD_AUTH_SECRET_LEN = 16;

/**
 * True when a secret is empty, a known placeholder, or too short for production.
 * Used so Compose/docs placeholders cannot ship as working unlock keys.
 */
export function isWeakPasteAuthSecret(secret: string | undefined): boolean {
  if (secret == null) return true;
  const s = secret.trim();
  if (!s) return true;
  if (WEAK_PASTE_AUTH_SECRETS.has(s.toLowerCase())) return true;
  if (WEAK_PASTE_AUTH_SECRETS.has(s)) return true;
  if (s.length < MIN_PROD_AUTH_SECRET_LEN) return true;
  return false;
}

export function getPasteAuthSecret(): string {
  const secret = process.env.PASTE_AUTH_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!secret || isWeakPasteAuthSecret(secret)) {
      throw new Error(
        "PASTE_AUTH_SECRET must be a strong random value in production " +
          `(≥${MIN_PROD_AUTH_SECRET_LEN} chars; not a documented placeholder). ` +
          'Generate one with: openssl rand -hex 32',
      );
    }
    return secret;
  }
  if (secret && !isWeakPasteAuthSecret(secret)) return secret;
  // Deterministic dev fallback so cookies work across reloads; not for production.
  return "papercut-dev-only-secret-change-me";
}

/**
 * How many reverse-proxy hops to trust when reading X-Forwarded-For.
 * Default 0 (ignore XFF) so direct deploys cannot have rate limits bypassed
 * by spoofed X-Forwarded-For. Set to 1 behind a single nginx/Caddy/Traefik.
 */
export function getTrustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS;
  if (raw === undefined || raw.trim() === "") return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid TRUSTED_PROXY_HOPS: ${raw}`);
  }
  return Math.min(n, 32);
}

/**
 * Whether unlock cookies should use the Secure flag.
 * Prefer explicit COOKIE_SECURE; else https PAPERCUT_PUBLIC_URL; else production NODE_ENV.
 */
export function getCookieSecure(): boolean {
  const forced = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (forced === "1" || forced === "true" || forced === "yes" || forced === "on") {
    return true;
  }
  if (
    forced === "0" ||
    forced === "false" ||
    forced === "no" ||
    forced === "off"
  ) {
    return false;
  }
  const pub = getPublicUrl();
  if (pub?.startsWith("https://")) return true;
  if (pub?.startsWith("http://")) return false;
  return process.env.NODE_ENV === "production";
}
