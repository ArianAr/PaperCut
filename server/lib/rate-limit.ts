/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-node / Docker deploys. Keys are never written to logs.
 */

import { getTrustedProxyHops } from "./env";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window has capacity again (when blocked) */
  retryAfterSec: number;
  remaining: number;
}

export interface RateLimiterOptions {
  /** Max successful attempts allowed in the window */
  limit: number;
  /** Window length in milliseconds */
  windowMs: number;
  /** Optional clock for tests */
  now?: () => number;
}

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(options: RateLimiterOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
  }

  /**
   * Record an attempt and return whether it is allowed.
   * Call this for every attempt you want to count (e.g. failed unlocks).
   */
  attempt(key: string): RateLimitResult {
    const now = this.now();
    const windowStart = now - this.windowMs;
    const prev = this.hits.get(key) ?? [];
    const recent = prev.filter((t) => t > windowStart);

    if (recent.length >= this.limit) {
      const oldest = recent[0]!;
      const retryAfterSec = Math.max(
        1,
        Math.ceil((oldest + this.windowMs - now) / 1000),
      );
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSec, remaining: 0 };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return {
      allowed: true,
      retryAfterSec: 0,
      remaining: Math.max(0, this.limit - recent.length),
    };
  }

  /** Test helper */
  reset(key?: string): void {
    if (key === undefined) this.hits.clear();
    else this.hits.delete(key);
  }

  /** Bound memory: drop empty/expired keys periodically */
  prune(): void {
    const now = this.now();
    const windowStart = now - this.windowMs;
    for (const [key, times] of this.hits) {
      const recent = times.filter((t) => t > windowStart);
      if (recent.length === 0) this.hits.delete(key);
      else this.hits.set(key, recent);
    }
  }
}

/** Shared limiters for the server process (not multi-instance safe). */
const globalForLimiters = globalThis as unknown as {
  __pcUnlockLimiter?: RateLimiter;
  __pcCreateLimiter?: RateLimiter;
};

export function getUnlockRateLimiter(): RateLimiter {
  if (!globalForLimiters.__pcUnlockLimiter) {
    globalForLimiters.__pcUnlockLimiter = new RateLimiter({
      limit: Number.parseInt(process.env.UNLOCK_RATE_LIMIT ?? "10", 10) || 10,
      windowMs:
        Number.parseInt(process.env.UNLOCK_RATE_WINDOW_MS ?? "600000", 10) ||
        600_000,
    });
  }
  return globalForLimiters.__pcUnlockLimiter;
}

export function getCreateRateLimiter(): RateLimiter {
  if (!globalForLimiters.__pcCreateLimiter) {
    globalForLimiters.__pcCreateLimiter = new RateLimiter({
      limit: Number.parseInt(process.env.CREATE_RATE_LIMIT ?? "60", 10) || 60,
      windowMs:
        Number.parseInt(process.env.CREATE_RATE_WINDOW_MS ?? "600000", 10) ||
        600_000,
    });
  }
  return globalForLimiters.__pcCreateLimiter;
}

/**
 * Coarse client key for rate limiting without logging.
 * Uses X-Forwarded-For when TRUSTED_PROXY_HOPS > 0: with N trusted proxies,
 * take the Nth address from the right (the client as seen by the outer proxy).
 * Keys are never written to application logs.
 */
export function clientKeyFromRequest(request: Request): string {
  const hops = getTrustedProxyHops();
  if (hops <= 0) return "local";

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length > 0) {
      const idx = Math.max(0, parts.length - hops);
      const ip = parts[idx]!;
      return ip.slice(0, 128);
    }
  }
  // No stable remote address in the Fetch Request API without platform hooks.
  return "local";
}
