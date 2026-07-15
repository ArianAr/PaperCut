import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCookieSecure,
  getMaxPasteSize,
  getPasteAuthSecret,
  getPublicUrl,
  getTrustedProxyHops,
  isWeakPasteAuthSecret,
} from "./env";

const keys = [
  "MAX_PASTE_SIZE",
  "PASTE_AUTH_SECRET",
  "PAPERCUT_PUBLIC_URL",
  "TRUSTED_PROXY_HOPS",
  "COOKIE_SECURE",
] as const;

const snapshot: Partial<Record<(typeof keys)[number], string | undefined>> = {};

afterEach(() => {
  vi.unstubAllEnvs();
  for (const key of keys) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
});

function remember() {
  for (const key of keys) {
    snapshot[key] = process.env[key];
  }
}

describe("env helpers", () => {
  it("defaults max paste size and validates overrides", () => {
    remember();
    delete process.env.MAX_PASTE_SIZE;
    expect(getMaxPasteSize()).toBe(10 * 1024 * 1024);

    process.env.MAX_PASTE_SIZE = "2048";
    expect(getMaxPasteSize()).toBe(2048);

    process.env.MAX_PASTE_SIZE = "nope";
    expect(() => getMaxPasteSize()).toThrow(/Invalid MAX_PASTE_SIZE/);
  });

  it("strips trailing slash from public URL", () => {
    remember();
    process.env.PAPERCUT_PUBLIC_URL = "https://cut.example/";
    expect(getPublicUrl()).toBe("https://cut.example");
    delete process.env.PAPERCUT_PUBLIC_URL;
    expect(getPublicUrl()).toBeUndefined();
  });

  it("requires a strong auth secret in production", () => {
    remember();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PASTE_AUTH_SECRET", "");
    delete process.env.PASTE_AUTH_SECRET;
    expect(() => getPasteAuthSecret()).toThrow(/PASTE_AUTH_SECRET/);

    vi.stubEnv(
      "PASTE_AUTH_SECRET",
      "change-me-in-production-use-a-long-random-string",
    );
    expect(() => getPasteAuthSecret()).toThrow(/strong random|placeholder/i);

    vi.stubEnv("PASTE_AUTH_SECRET", "short");
    expect(() => getPasteAuthSecret()).toThrow(/PASTE_AUTH_SECRET/);

    vi.stubEnv("PASTE_AUTH_SECRET", "prod-secret-long-enough");
    expect(getPasteAuthSecret()).toBe("prod-secret-long-enough");
  });

  it("detects weak placeholder secrets", () => {
    expect(isWeakPasteAuthSecret(undefined)).toBe(true);
    expect(isWeakPasteAuthSecret("")).toBe(true);
    expect(
      isWeakPasteAuthSecret("change-me-to-a-long-random-string"),
    ).toBe(true);
    expect(isWeakPasteAuthSecret("prod-secret-long-enough")).toBe(false);
  });

  it("defaults trusted proxy hops to 0 (ignore XFF)", () => {
    remember();
    delete process.env.TRUSTED_PROXY_HOPS;
    expect(getTrustedProxyHops()).toBe(0);
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(getTrustedProxyHops()).toBe(2);
    process.env.TRUSTED_PROXY_HOPS = "1";
    expect(getTrustedProxyHops()).toBe(1);
    process.env.TRUSTED_PROXY_HOPS = "0";
    expect(getTrustedProxyHops()).toBe(0);
  });

  it("derives cookie Secure from URL or override", () => {
    remember();
    delete process.env.COOKIE_SECURE;
    delete process.env.PAPERCUT_PUBLIC_URL;
    vi.stubEnv("NODE_ENV", "development");
    expect(getCookieSecure()).toBe(false);

    process.env.PAPERCUT_PUBLIC_URL = "https://paste.example";
    expect(getCookieSecure()).toBe(true);

    process.env.PAPERCUT_PUBLIC_URL = "http://localhost:3000";
    expect(getCookieSecure()).toBe(false);

    process.env.COOKIE_SECURE = "1";
    expect(getCookieSecure()).toBe(true);
  });
});
