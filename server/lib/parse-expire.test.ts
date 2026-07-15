import { describe, expect, it } from "vitest";
import { parseExpire } from "./parse-expire";

const NOW = 1_700_000_000_000;

describe("parseExpire", () => {
  it("parses minutes, hours, days, weeks, seconds", () => {
    expect(parseExpire("30m", NOW)).toEqual({
      ok: true,
      durationMs: 30 * 60 * 1000,
      expiresAt: NOW + 30 * 60 * 1000,
    });
    expect(parseExpire("1h", NOW)).toMatchObject({
      ok: true,
      durationMs: 3600_000,
    });
    expect(parseExpire("7d", NOW)).toMatchObject({
      ok: true,
      durationMs: 7 * 24 * 3600_000,
    });
    expect(parseExpire("2w", NOW)).toMatchObject({
      ok: true,
      durationMs: 14 * 24 * 3600_000,
    });
    expect(parseExpire("45s", NOW)).toMatchObject({
      ok: true,
      durationMs: 45_000,
    });
  });

  it("accepts whitespace and case-insensitive units", () => {
    expect(parseExpire(" 1H ", NOW)).toMatchObject({ ok: true });
    expect(parseExpire("3D", NOW)).toMatchObject({ ok: true });
  });

  it("rejects empty and malformed input", () => {
    expect(parseExpire("", NOW).ok).toBe(false);
    expect(parseExpire("tomorrow", NOW).ok).toBe(false);
    expect(parseExpire("1x", NOW).ok).toBe(false);
    expect(parseExpire("-1h", NOW).ok).toBe(false);
  });

  it("rejects zero and over-cap durations", () => {
    expect(parseExpire("0h", NOW)).toMatchObject({ ok: false });
    expect(parseExpire("400d", NOW)).toMatchObject({ ok: false });
  });
});
