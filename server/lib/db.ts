import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { getDatabasePath } from "./env";
import * as schema from "./schema";

export type AppDatabase = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as {
  __papercutDb?: AppDatabase;
  __papercutSqlite?: Database.Database;
};

function migrate(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS pastes (
      id TEXT PRIMARY KEY NOT NULL,
      raw_content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER,
      is_encrypted INTEGER NOT NULL DEFAULT 0,
      password_hash TEXT,
      metadata TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pastes_expires_at_idx ON pastes (expires_at);
  `);
}

export function createDatabase(dbPath: string): {
  db: AppDatabase;
  sqlite: Database.Database;
} {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  migrate(sqlite);

  return { db: drizzle(sqlite, { schema }), sqlite };
}

/**
 * Process-wide DB singleton for the Next.js server runtime.
 * Tests should prefer `createDatabase` with a temp path.
 */
export function getDb(): AppDatabase {
  if (globalForDb.__papercutDb) {
    return globalForDb.__papercutDb;
  }

  const dbPath = getDatabasePath();
  const { db, sqlite } = createDatabase(dbPath);
  globalForDb.__papercutSqlite = sqlite;
  globalForDb.__papercutDb = db;
  return db;
}

/** Close singleton (tests / graceful shutdown). */
export function closeDb(): void {
  globalForDb.__papercutSqlite?.close();
  globalForDb.__papercutSqlite = undefined;
  globalForDb.__papercutDb = undefined;
}
