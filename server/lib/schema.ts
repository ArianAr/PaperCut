import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Paste rows store full raw stdin (including ANSI) plus optional expiry
 * and password protection metadata.
 */
export const pastes = sqliteTable("pastes", {
  id: text("id").primaryKey(),
  rawContent: text("raw_content").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  expiresAt: integer("expires_at", { mode: "number" }),
  isEncrypted: integer("is_encrypted", { mode: "boolean" })
    .notNull()
    .default(false),
  passwordHash: text("password_hash"),
  metadata: text("metadata").notNull(),
});

export type PasteRow = typeof pastes.$inferSelect;
export type NewPasteRow = typeof pastes.$inferInsert;
