/**
 * Route-handler integration tests: real SQLite, mocked Next cookie jar.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createDatabase, type AppDatabase } from "@/lib/db";
import { RateLimiter } from "@/lib/rate-limit";
import { authCookieName } from "@/lib/auth-cookie";

let sqlite: Database.Database | undefined;
let dbPath: string | undefined;
let db: AppDatabase;
const cookieJar = new Map<string, string>();

vi.mock("@/lib/db", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db")>("@/lib/db");
  return {
    ...actual,
    getDb: () => db,
  };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

import { POST as createPasteRoute } from "./pastes/route";
import { GET as getPasteRoute } from "./pastes/[id]/route";
import { POST as unlockPasteRoute } from "./pastes/[id]/unlock/route";
import { GET as healthRoute } from "./health/route";
import * as rateLimitMod from "@/lib/rate-limit";

function openTempDb() {
  dbPath = path.join(
    os.tmpdir(),
    `papercut-api-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
  );
  const created = createDatabase(dbPath);
  db = created.db;
  sqlite = created.sqlite;
}

beforeEach(() => {
  openTempDb();
  cookieJar.clear();
  process.env.PASTE_AUTH_SECRET = "test-secret-for-api-integration";
  process.env.PAPERCUT_PUBLIC_URL = "http://test.local";
  vi.restoreAllMocks();
});

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

describe("API integration", () => {
  it("GET /api/health returns ok", async () => {
    const res = await healthRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("papercut");
  });

  it("POST /api/pastes creates a public paste and GET returns content", async () => {
    const req = new Request("http://test.local/api/pastes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "[INFO] hello\n[ERROR] boom" }),
    });
    const created = await createPasteRoute(req);
    expect(created.status).toBe(201);
    const data = await created.json();
    expect(data.id).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(data.url).toBe(`http://test.local/paste/${data.id}`);
    expect(data.metadata.lineCount).toBe(2);

    const getRes = await getPasteRoute(
      new Request(`http://test.local/api/pastes/${data.id}`),
      { params: Promise.resolve({ id: data.id }) },
    );
    expect(getRes.status).toBe(200);
    const paste = await getRes.json();
    expect(paste.rawContent).toContain("[INFO] hello");
    expect(paste.isEncrypted).toBe(false);
  });

  it("rejects empty content and invalid expire", async () => {
    const empty = await createPasteRoute(
      new Request("http://test.local/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      }),
    );
    expect(empty.status).toBe(400);

    const badExpire = await createPasteRoute(
      new Request("http://test.local/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "x", expire: "nope" }),
      }),
    );
    expect(badExpire.status).toBe(400);
  });

  it("locks password pastes until unlock cookie is set", async () => {
    const created = await createPasteRoute(
      new Request("http://test.local/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "secret", password: "s3cret" }),
      }),
    );
    const { id } = await created.json();

    const locked = await getPasteRoute(
      new Request(`http://test.local/api/pastes/${id}`),
      { params: Promise.resolve({ id }) },
    );
    expect(locked.status).toBe(401);
    const lockedBody = await locked.json();
    expect(lockedBody.locked).toBe(true);

    const wrong = await unlockPasteRoute(
      new Request(`http://test.local/api/pastes/${id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "nope" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(wrong.status).toBe(401);

    const unlock = await unlockPasteRoute(
      new Request(`http://test.local/api/pastes/${id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "s3cret" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(unlock.status).toBe(200);

    const setCookie = unlock.headers.getSetCookie?.() ?? [];
    const cookieHeader =
      setCookie.join(";") || unlock.headers.get("set-cookie") || "";
    expect(cookieHeader).toContain(authCookieName(id));

    const match = new RegExp(`${authCookieName(id)}=([^;]+)`).exec(cookieHeader);
    expect(match?.[1]).toBeTruthy();
    cookieJar.set(authCookieName(id), decodeURIComponent(match![1]!));

    const open = await getPasteRoute(
      new Request(`http://test.local/api/pastes/${id}`),
      { params: Promise.resolve({ id }) },
    );
    expect(open.status).toBe(200);
    const body = await open.json();
    expect(body.rawContent).toBe("secret");
  });

  it("returns 404 for unknown ids", async () => {
    const res = await getPasteRoute(
      new Request("http://test.local/api/pastes/doesnotexist1"),
      { params: Promise.resolve({ id: "doesnotexist1" }) },
    );
    expect(res.status).toBe(404);
  });

  it("rate-limits unlock attempts with 429", async () => {
    const tiny = new RateLimiter({ limit: 2, windowMs: 600_000 });
    vi.spyOn(rateLimitMod, "getUnlockRateLimiter").mockReturnValue(tiny);

    const created = await createPasteRoute(
      new Request("http://test.local/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "x", password: "pw" }),
      }),
    );
    const { id } = await created.json();

    for (let i = 0; i < 2; i++) {
      const r = await unlockPasteRoute(
        new Request(`http://test.local/api/pastes/${id}/unlock`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": "203.0.113.50",
          },
          body: JSON.stringify({ password: "wrong" }),
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(r.status).toBe(401);
    }

    const limited = await unlockPasteRoute(
      new Request(`http://test.local/api/pastes/${id}/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": "203.0.113.50",
        },
        body: JSON.stringify({ password: "wrong" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });
});
