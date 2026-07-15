import { afterEach, describe, expect, it, vi } from "vitest";
import { getMaxPasteSize, getPasteAuthSecret, getPublicUrl } from "./env";

const keys = [
  "MAX_PASTE_SIZE",
  "PASTE_AUTH_SECRET",
  "PAPERCUT_PUBLIC_URL",
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

  it("requires auth secret in production", () => {
    remember();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PASTE_AUTH_SECRET", "");
    delete process.env.PASTE_AUTH_SECRET;
    expect(() => getPasteAuthSecret()).toThrow(/PASTE_AUTH_SECRET/);

    vi.stubEnv("PASTE_AUTH_SECRET", "prod-secret");
    expect(getPasteAuthSecret()).toBe("prod-secret");
  });
});
