import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import type { AppDatabase } from "./db";
import { getMaxPasteSize } from "./env";
import {
  computeMetadata,
  parseMetadata,
  serializeMetadata,
  type PasteMetadata,
} from "./metadata";
import { parseExpire } from "./parse-expire";
import { hashPassword, verifyPassword } from "./password";
import { pastes, type PasteRow } from "./schema";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  12,
);

export interface CreatePasteInput {
  content: string;
  expire?: string;
  password?: string;
  now?: number;
  maxSize?: number;
}

export type CreatePasteResult =
  | { ok: true; id: string; metadata: PasteMetadata; expiresAt: number | null }
  | { ok: false; status: number; error: string };

export interface PublicPaste {
  id: string;
  rawContent: string;
  createdAt: number;
  expiresAt: number | null;
  isEncrypted: boolean;
  metadata: PasteMetadata;
}

export type GetPasteResult =
  | { ok: true; paste: PublicPaste }
  | { ok: false; status: number; error: string; locked?: boolean };

function toPublic(row: PasteRow): PublicPaste {
  return {
    id: row.id,
    rawContent: row.rawContent,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt ?? null,
    isEncrypted: Boolean(row.isEncrypted),
    metadata: parseMetadata(row.metadata),
  };
}

export function isExpired(row: PasteRow, now: number = Date.now()): boolean {
  return row.expiresAt != null && row.expiresAt <= now;
}

export function createPaste(
  db: AppDatabase,
  input: CreatePasteInput,
): CreatePasteResult {
  const now = input.now ?? Date.now();
  const maxSize = input.maxSize ?? getMaxPasteSize();
  const content = input.content;

  if (typeof content !== "string") {
    return { ok: false, status: 400, error: "content is required" };
  }

  const byteLength = Buffer.byteLength(content, "utf8");
  if (byteLength === 0) {
    return { ok: false, status: 400, error: "content must not be empty" };
  }
  if (byteLength > maxSize) {
    return {
      ok: false,
      status: 413,
      error: `content exceeds maximum size of ${maxSize} bytes`,
    };
  }

  let expiresAt: number | null = null;
  if (input.expire) {
    const parsed = parseExpire(input.expire, now);
    if (!parsed.ok) {
      return { ok: false, status: 400, error: parsed.error };
    }
    expiresAt = parsed.expiresAt;
  }

  let passwordHash: string | null = null;
  let isEncrypted = false;
  if (input.password != null && input.password !== "") {
    passwordHash = hashPassword(input.password);
    isEncrypted = true;
  }

  const metadata = computeMetadata(content);
  const id = nanoid();

  db.insert(pastes)
    .values({
      id,
      rawContent: content,
      createdAt: now,
      expiresAt,
      isEncrypted,
      passwordHash,
      metadata: serializeMetadata(metadata),
    })
    .run();

  return { ok: true, id, metadata, expiresAt };
}

/**
 * Load a paste. When password-protected, `unlocked` must be true or status 401.
 * Expired pastes are deleted and return 404.
 */
export function getPaste(
  db: AppDatabase,
  id: string,
  options?: { unlocked?: boolean; now?: number },
): GetPasteResult {
  const now = options?.now ?? Date.now();
  const row = db.select().from(pastes).where(eq(pastes.id, id)).get();

  if (!row) {
    return { ok: false, status: 404, error: "Paste not found" };
  }

  if (isExpired(row, now)) {
    db.delete(pastes).where(eq(pastes.id, id)).run();
    return { ok: false, status: 404, error: "Paste not found" };
  }

  if (row.isEncrypted && !options?.unlocked) {
    return {
      ok: false,
      status: 401,
      error: "Password required",
      locked: true,
    };
  }

  return { ok: true, paste: toPublic(row) };
}

export type UnlockResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function unlockPaste(
  db: AppDatabase,
  id: string,
  password: string,
  options?: { now?: number },
): UnlockResult {
  const now = options?.now ?? Date.now();
  const row = db.select().from(pastes).where(eq(pastes.id, id)).get();

  if (!row) {
    return { ok: false, status: 404, error: "Paste not found" };
  }

  if (isExpired(row, now)) {
    db.delete(pastes).where(eq(pastes.id, id)).run();
    return { ok: false, status: 404, error: "Paste not found" };
  }

  if (!row.isEncrypted || !row.passwordHash) {
    return { ok: false, status: 400, error: "Paste is not password-protected" };
  }

  if (!verifyPassword(password, row.passwordHash)) {
    return { ok: false, status: 401, error: "Invalid password" };
  }

  return { ok: true };
}

/** Metadata-only view for locked pastes (no content, no hash). */
export function getPasteLockInfo(
  db: AppDatabase,
  id: string,
  options?: { now?: number },
):
  | { ok: true; id: string; createdAt: number; expiresAt: number | null }
  | { ok: false; status: number; error: string } {
  const now = options?.now ?? Date.now();
  const row = db.select().from(pastes).where(eq(pastes.id, id)).get();

  if (!row) {
    return { ok: false, status: 404, error: "Paste not found" };
  }

  if (isExpired(row, now)) {
    db.delete(pastes).where(eq(pastes.id, id)).run();
    return { ok: false, status: 404, error: "Paste not found" };
  }

  return {
    ok: true,
    id: row.id,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt ?? null,
  };
}
