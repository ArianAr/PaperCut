import { afterEach, describe, expect, it } from "vitest";
import { RateLimiter, clientKeyFromRequest } from "./rate-limit";

const prevHops = process.env.TRUSTED_PROXY_HOPS;
afterEach(() => {
  if (prevHops === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = prevHops;
});

describe("RateLimiter", () => {
  it("allows up to limit attempts in the window", () => {
    let now = 1_000_000;
    const limiter = new RateLimiter({
      limit: 3,
      windowMs: 60_000,
      now: () => now,
    });

    expect(limiter.attempt("k").allowed).toBe(true);
    expect(limiter.attempt("k").allowed).toBe(true);
    expect(limiter.attempt("k").allowed).toBe(true);
    const blocked = limiter.attempt("k");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window slides", () => {
    let now = 1_000_000;
    const limiter = new RateLimiter({
      limit: 2,
      windowMs: 10_000,
      now: () => now,
    });

    expect(limiter.attempt("a").allowed).toBe(true);
    expect(limiter.attempt("a").allowed).toBe(true);
    expect(limiter.attempt("a").allowed).toBe(false);

    now += 10_001;
    expect(limiter.attempt("a").allowed).toBe(true);
  });

  it("isolates keys", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.attempt("one").allowed).toBe(true);
    expect(limiter.attempt("one").allowed).toBe(false);
    expect(limiter.attempt("two").allowed).toBe(true);
  });
});

describe("clientKeyFromRequest", () => {
  it("with 1 trusted hop uses the rightmost XFF entry", () => {
    process.env.TRUSTED_PROXY_HOPS = "1";
    const req = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    // spoofed, real-from-proxy → trust last hop
    expect(clientKeyFromRequest(req)).toBe("10.0.0.1");
  });

  it("with 2 trusted hops uses second-from-right", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    const req = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "198.51.100.1, 203.0.113.1, 10.0.0.1" },
    });
    expect(clientKeyFromRequest(req)).toBe("203.0.113.1");
  });

  it("ignores XFF when hops is 0", () => {
    process.env.TRUSTED_PROXY_HOPS = "0";
    const req = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "203.0.113.1" },
    });
    expect(clientKeyFromRequest(req)).toBe("local");
  });

  it("falls back to local without XFF", () => {
    delete process.env.TRUSTED_PROXY_HOPS;
    const req = new Request("http://localhost/api");
    expect(clientKeyFromRequest(req)).toBe("local");
  });
});
