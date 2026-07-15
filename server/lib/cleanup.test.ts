import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { createDatabase, type AppDatabase } from "./db";
import { purgeExpiredPastes } from "./cleanup";
import { createPaste, getPaste } from "./paste";

let sqlite: Database.Database | undefined;
let dbPath: string | undefined;
let db: AppDatabase;

function openTempDb() {
  dbPath = path.join(
    os.tmpdir(),
    `papercut-cleanup-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
  );
  const created = createDatabase(dbPath);
  db = created.db;
  sqlite = created.sqlite;
}

afterEach(() => {
  sqlite?.close();
  sqlite = undefined;
  if (dbPath) {
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        fs.unlinkSync(dbPath + suffix);
      } catch {
        /* ignore */
      }
    }
  }
  dbPath = undefined;
});

describe("purgeExpiredPastes", () => {
  it("removes only expired rows", () => {
    openTempDb();
    const now = 1_000_000;
    const kept = createPaste(db, {
      content: "keep",
      expire: "1h",
      now,
    });
    const gone = createPaste(db, {
      content: "gone",
      expire: "1h",
      now: now - 3_600_000 - 1,
    });
    expect(kept.ok && gone.ok).toBe(true);
    if (!kept.ok || !gone.ok) return;

    const removed = purgeExpiredPastes(db, now);
    expect(removed).toBeGreaterThanOrEqual(1);

    expect(getPaste(db, kept.id, { now }).ok).toBe(true);
    expect(getPaste(db, gone.id, { now }).ok).toBe(false);
  });

  it("returns 0 when nothing expired", () => {
    openTempDb();
    createPaste(db, { content: "x", now: 1000 });
    expect(purgeExpiredPastes(db, 1000)).toBe(0);
  });
});
