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

export function getPasteAuthSecret(): string {
  const secret = process.env.PASTE_AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PASTE_AUTH_SECRET is required in production");
  }
  // Deterministic dev fallback so cookies work across reloads; not for production.
  return "papercut-dev-only-secret-change-me";
}
