import { describe, expect, it } from "vitest";
import {
  readBodyWithLimit,
  readJsonBodyWithLimit,
} from "./request-body";

describe("readBodyWithLimit", () => {
  it("reads a small body", async () => {
    const req = new Request("http://t/", {
      method: "POST",
      body: "hello",
    });
    const r = await readBodyWithLimit(req, 100);
    expect(r).toEqual({ ok: true, text: "hello" });
  });

  it("rejects when Content-Length exceeds max", async () => {
    const req = new Request("http://t/", {
      method: "POST",
      headers: { "Content-Length": "999" },
      body: "x",
    });
    const r = await readBodyWithLimit(req, 10);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(413);
    }
  });

  it("rejects when streamed body exceeds max", async () => {
    const req = new Request("http://t/", {
      method: "POST",
      body: "a".repeat(50),
    });
    const r = await readBodyWithLimit(req, 10);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(413);
    }
  });
});

describe("readJsonBodyWithLimit", () => {
  it("parses JSON within limit", async () => {
    const req = new Request("http://t/", {
      method: "POST",
      body: JSON.stringify({ password: "secret" }),
    });
    const r = await readJsonBodyWithLimit<{ password: string }>(req, 1024);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.password).toBe("secret");
  });

  it("rejects invalid JSON", async () => {
    const req = new Request("http://t/", {
      method: "POST",
      body: "not-json",
    });
    const r = await readJsonBodyWithLimit(req, 1024);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
});
