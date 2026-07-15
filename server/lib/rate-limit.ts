/**
 * Sliding-window rate limiter (in-memory) with optional Redis fixed-window backend.
 * Keys are never written to application logs.
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

export type RateLimitScope = "create" | "unlock";

/** Soft cap on distinct client keys held in memory (evict expired, then oldest). */
const DEFAULT_MAX_KEYS = 50_000;
/** Prune expired keys every N attempts to bound memory under key churn. */
const PRUNE_EVERY_ATTEMPTS = 64;

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly maxKeys: number;
  private attemptCount = 0;

  constructor(options: RateLimiterOptions & { maxKeys?: number }) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
    this.maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  }

  /**
   * Record an attempt and return whether it is allowed.
   * Call this for every attempt you want to count (e.g. failed unlocks).
   */
  attempt(key: string): RateLimitResult {
    this.attemptCount += 1;
    if (this.attemptCount % PRUNE_EVERY_ATTEMPTS === 0) {
      this.prune();
    }

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
    this.evictIfOverCap();
    return {
      allowed: true,
      retryAfterSec: 0,
      remaining: Math.max(0, this.limit - recent.length),
    };
  }

  /** Test helper */
  reset(key?: string): void {
    if (key === undefined) {
      this.hits.clear();
      this.attemptCount = 0;
    } else this.hits.delete(key);
  }

  /** Number of tracked keys (test helper). */
  size(): number {
    return this.hits.size;
  }

  /** Bound memory: drop empty/expired keys periodically */
  prune(): void {
    const now = this.now();
    const windowStart = now - this.windowMs;
    for (const [k, times] of this.hits) {
      const recent = times.filter((t) => t > windowStart);
      if (recent.length === 0) this.hits.delete(k);
      else this.hits.set(k, recent);
    }
  }

  /** If still over cap after prune, drop arbitrary oldest Map entries (FIFO). */
  private evictIfOverCap(): void {
    if (this.hits.size <= this.maxKeys) return;
    this.prune();
    while (this.hits.size > this.maxKeys) {
      const oldestKey = this.hits.keys().next().value;
      if (oldestKey === undefined) break;
      this.hits.delete(oldestKey);
    }
  }
}

/** Shared limiters for the server process (not multi-instance safe). */
const globalForLimiters = globalThis as unknown as {
  __pcUnlockLimiter?: RateLimiter;
  __pcCreateLimiter?: RateLimiter;
  __pcRedisClient?: import("redis").RedisClientType;
  __pcRedisConnect?: Promise<import("redis").RedisClientType | null>;
};

function scopeLimits(scope: RateLimitScope): { limit: number; windowMs: number } {
  if (scope === "unlock") {
    return {
      limit: Number.parseInt(process.env.UNLOCK_RATE_LIMIT ?? "10", 10) || 10,
      windowMs:
        Number.parseInt(process.env.UNLOCK_RATE_WINDOW_MS ?? "600000", 10) ||
        600_000,
    };
  }
  return {
    limit: Number.parseInt(process.env.CREATE_RATE_LIMIT ?? "60", 10) || 60,
    windowMs:
      Number.parseInt(process.env.CREATE_RATE_WINDOW_MS ?? "600000", 10) ||
      600_000,
  };
}

export function getUnlockRateLimiter(): RateLimiter {
  if (!globalForLimiters.__pcUnlockLimiter) {
    const { limit, windowMs } = scopeLimits("unlock");
    globalForLimiters.__pcUnlockLimiter = new RateLimiter({ limit, windowMs });
  }
  return globalForLimiters.__pcUnlockLimiter;
}

export function getCreateRateLimiter(): RateLimiter {
  if (!globalForLimiters.__pcCreateLimiter) {
    const { limit, windowMs } = scopeLimits("create");
    globalForLimiters.__pcCreateLimiter = new RateLimiter({ limit, windowMs });
  }
  return globalForLimiters.__pcCreateLimiter;
}

function memoryAttempt(scope: RateLimitScope, key: string): RateLimitResult {
  const limiter =
    scope === "unlock" ? getUnlockRateLimiter() : getCreateRateLimiter();
  return limiter.attempt(key);
}

async function getRedisClient(): Promise<import("redis").RedisClientType | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (globalForLimiters.__pcRedisClient?.isOpen) {
    return globalForLimiters.__pcRedisClient;
  }

  if (!globalForLimiters.__pcRedisConnect) {
    globalForLimiters.__pcRedisConnect = (async () => {
      try {
        const { createClient } = await import("redis");
        const client = createClient({ url });
        client.on("error", () => {
          /* connection errors fall back to memory on next call */
        });
        await client.connect();
        globalForLimiters.__pcRedisClient =
          client as import("redis").RedisClientType;
        return globalForLimiters.__pcRedisClient;
      } catch {
        return null;
      }
    })();
  }

  return globalForLimiters.__pcRedisConnect;
}

/**
 * Fixed-window counter in Redis (multi-instance safe).
 * Falls back to in-memory sliding window when REDIS_URL is unset or Redis fails.
 */
export async function checkRateLimit(
  scope: RateLimitScope,
  key: string,
): Promise<RateLimitResult> {
  const { limit, windowMs } = scopeLimits(scope);
  const redisKey = `papercut:rl:${scope}:${key}`;

  try {
    const client = await getRedisClient();
    if (client?.isOpen) {
      const n = await client.incr(redisKey);
      if (n === 1) {
        await client.pExpire(redisKey, windowMs);
      }
      if (n > limit) {
        const ttl = await client.pTTL(redisKey);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSec: Math.max(1, Math.ceil((ttl > 0 ? ttl : windowMs) / 1000)),
        };
      }
      return {
        allowed: true,
        remaining: Math.max(0, limit - n),
        retryAfterSec: 0,
      };
    }
  } catch {
    // fall through
  }

  return memoryAttempt(scope, key);
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
