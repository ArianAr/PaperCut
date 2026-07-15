import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDatabase } from "./db";
import { createPaste, getPaste, unlockPaste } from "./paste";
import type { AppDatabase } from "./db";
import type Database from "better-sqlite3";

let sqlite: Database.Database | undefined;
let dbPath: string | undefined;
let db: AppDatabase;

function openTempDb() {
  dbPath = path.join(
    os.tmpdir(),
    `papercut-test-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
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

describe("createPaste / getPaste", () => {
  it("creates a public paste and returns content", () => {
    openTempDb();
    const created = createPaste(db, {
      content: "[INFO] hello\n[ERROR] boom",
      now: 1000,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(created.id).toHaveLength(12);
    expect(created.metadata.lineCount).toBe(2);
    expect(created.metadata.levels.INFO).toBe(1);
    expect(created.metadata.levels.ERROR).toBe(1);

    const got = getPaste(db, created.id, { now: 1000 });
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(got.paste.rawContent).toContain("[INFO] hello");
    expect(got.paste.isEncrypted).toBe(false);
  });

  it("rejects empty content and oversize bodies", () => {
    openTempDb();
    expect(createPaste(db, { content: "" }).ok).toBe(false);
    const oversized = createPaste(db, {
      content: "x".repeat(100),
      maxSize: 10,
    });
    expect(oversized.ok).toBe(false);
    if (oversized.ok) return;
    expect(oversized.status).toBe(413);
  });

  it("stores expiry and purges expired pastes on read", () => {
    openTempDb();
    const created = createPaste(db, {
      content: "temp",
      expire: "1h",
      now: 1_000_000,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.expiresAt).toBe(1_000_000 + 3600_000);

    const stillValid = getPaste(db, created.id, { now: 1_000_000 + 10 });
    expect(stillValid.ok).toBe(true);

    const expired = getPaste(db, created.id, {
      now: 1_000_000 + 3600_000 + 1,
    });
    expect(expired.ok).toBe(false);
    if (expired.ok) return;
    expect(expired.status).toBe(404);

    const gone = getPaste(db, created.id, { now: 1_000_000 + 3600_000 + 2 });
    expect(gone.ok).toBe(false);
  });

  it("rejects invalid expire strings", () => {
    openTempDb();
    const bad = createPaste(db, { content: "x", expire: "nope" });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.status).toBe(400);
  });
});

describe("password-protected pastes", () => {
  it("locks content until unlock succeeds", () => {
    openTempDb();
    const created = createPaste(db, {
      content: "secret log",
      password: "hunter2",
      now: 50,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const locked = getPaste(db, created.id, { now: 50 });
    expect(locked.ok).toBe(false);
    if (locked.ok) return;
    expect(locked.status).toBe(401);
    expect(locked.locked).toBe(true);

    const wrong = unlockPaste(db, created.id, "nope", { now: 50 });
    expect(wrong.ok).toBe(false);

    const right = unlockPaste(db, created.id, "hunter2", { now: 50 });
    expect(right.ok).toBe(true);

    const unlocked = getPaste(db, created.id, { unlocked: true, now: 50 });
    expect(unlocked.ok).toBe(true);
    if (!unlocked.ok) return;
    expect(unlocked.paste.rawContent).toBe("secret log");
    expect(unlocked.paste.isEncrypted).toBe(true);
  });

  it("does not expose password hash on public paste object", () => {
    openTempDb();
    const created = createPaste(db, {
      content: "x",
      password: "pw",
      now: 1,
    });
    if (!created.ok) throw new Error("create failed");
    const unlocked = getPaste(db, created.id, { unlocked: true, now: 1 });
    if (!unlocked.ok) throw new Error("get failed");
    expect(
      Object.prototype.hasOwnProperty.call(unlocked.paste, "passwordHash"),
    ).toBe(false);
  });
});
