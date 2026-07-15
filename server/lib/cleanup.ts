import { and, isNotNull, lte } from "drizzle-orm";
import type { AppDatabase } from "./db";
import { pastes } from "./schema";

/**
 * Delete expired pastes. Safe to call frequently (e.g. on write / health).
 * Returns the number of rows removed.
 */
export function purgeExpiredPastes(
  db: AppDatabase,
  now: number = Date.now(),
): number {
  const result = db
    .delete(pastes)
    .where(and(isNotNull(pastes.expiresAt), lte(pastes.expiresAt, now)))
    .run();
  return result.changes;
}
