import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MetricsRegistry,
  getMetrics,
  isMetricsEnabled,
  recordMetric,
} from "./metrics";

const KEY = "PAPERCUT_METRICS";
let prev: string | undefined;

beforeEach(() => {
  prev = process.env[KEY];
  delete process.env[KEY];
  getMetrics().reset();
});

afterEach(() => {
  if (prev === undefined) delete process.env[KEY];
  else process.env[KEY] = prev;
  getMetrics().reset();
});

describe("isMetricsEnabled", () => {
  it("is off by default", () => {
    delete process.env[KEY];
    expect(isMetricsEnabled()).toBe(false);
  });

  it.each(["1", "true", "TRUE", "yes", "on", " Yes "])(
    "accepts %j as enabled",
    (value) => {
      process.env[KEY] = value;
      expect(isMetricsEnabled()).toBe(true);
    },
  );

  it.each(["0", "false", "no", "off", "", "maybe"])(
    "rejects %j",
    (value) => {
      process.env[KEY] = value;
      expect(isMetricsEnabled()).toBe(false);
    },
  );
});

describe("MetricsRegistry", () => {
  it("starts at zero and increments named counters", () => {
    const m = new MetricsRegistry({ startedAt: 0, now: () => 5_000 });
    expect(m.snapshot()).toEqual({
      enabled: true,
      uptimeSec: 5,
      counters: {
        pastes_created: 0,
        unlocks_ok: 0,
        rate_limited: 0,
      },
    });

    m.inc("pastes_created");
    m.inc("unlocks_ok", 2);
    m.inc("rate_limited");
    expect(m.snapshot().counters).toEqual({
      pastes_created: 1,
      unlocks_ok: 2,
      rate_limited: 1,
    });
  });

  it("ignores non-positive increments", () => {
    const m = new MetricsRegistry();
    m.inc("pastes_created", 0);
    m.inc("pastes_created", -1);
    expect(m.snapshot().counters.pastes_created).toBe(0);
  });

  it("reset clears counters", () => {
    const m = new MetricsRegistry();
    m.inc("pastes_created", 3);
    m.reset();
    expect(m.snapshot().counters.pastes_created).toBe(0);
  });
});

describe("recordMetric", () => {
  it("no-ops when disabled", () => {
    delete process.env[KEY];
    recordMetric("pastes_created");
    expect(getMetrics().snapshot().counters.pastes_created).toBe(0);
  });

  it("increments when enabled", () => {
    process.env[KEY] = "1";
    recordMetric("pastes_created");
    recordMetric("unlocks_ok");
    recordMetric("rate_limited");
    expect(getMetrics().snapshot().counters).toEqual({
      pastes_created: 1,
      unlocks_ok: 1,
      rate_limited: 1,
    });
  });
});
