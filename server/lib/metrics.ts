/**
 * Opt-in in-process counters for operators.
 * Disabled by default. Never stores paste bodies, IPs, or rate-limit keys.
 */

export type MetricName =
  | "pastes_created"
  | "unlocks_ok"
  | "rate_limited";

export interface MetricsSnapshot {
  enabled: true;
  uptimeSec: number;
  counters: Record<MetricName, number>;
}

const NAMES: readonly MetricName[] = [
  "pastes_created",
  "unlocks_ok",
  "rate_limited",
] as const;

function parseTruthy(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Whether metrics collection and the scrape endpoint are enabled. */
export function isMetricsEnabled(): boolean {
  return parseTruthy(process.env.PAPERCUT_METRICS);
}

export class MetricsRegistry {
  private readonly counters = new Map<MetricName, number>();
  private readonly startedAt: number;
  private readonly now: () => number;

  constructor(options?: { now?: () => number; startedAt?: number }) {
    this.now = options?.now ?? Date.now;
    this.startedAt = options?.startedAt ?? this.now();
    for (const name of NAMES) {
      this.counters.set(name, 0);
    }
  }

  inc(name: MetricName, by = 1): void {
    if (!Number.isFinite(by) || by <= 0) return;
    const prev = this.counters.get(name) ?? 0;
    this.counters.set(name, prev + by);
  }

  snapshot(): MetricsSnapshot {
    const counters = {} as Record<MetricName, number>;
    for (const name of NAMES) {
      counters[name] = this.counters.get(name) ?? 0;
    }
    return {
      enabled: true,
      uptimeSec: Math.max(0, Math.floor((this.now() - this.startedAt) / 1000)),
      counters,
    };
  }

  /** Test helper */
  reset(): void {
    for (const name of NAMES) {
      this.counters.set(name, 0);
    }
  }
}

const globalForMetrics = globalThis as unknown as {
  __pcMetrics?: MetricsRegistry;
};

export function getMetrics(): MetricsRegistry {
  if (!globalForMetrics.__pcMetrics) {
    globalForMetrics.__pcMetrics = new MetricsRegistry();
  }
  return globalForMetrics.__pcMetrics;
}

/** Increment only when metrics are enabled (no-op when off). */
export function recordMetric(name: MetricName, by = 1): void {
  if (!isMetricsEnabled()) return;
  getMetrics().inc(name, by);
}
