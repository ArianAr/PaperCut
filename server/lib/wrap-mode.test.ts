import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WRAP_MODE_STORAGE_KEY,
  isWrapMode,
  persistWrapMode,
  readStoredWrapMode,
  resolveInitialWrapMode,
} from "./wrap-mode";

describe("isWrapMode", () => {
  it("accepts only wrap and nowrap", () => {
    expect(isWrapMode("wrap")).toBe(true);
    expect(isWrapMode("nowrap")).toBe(true);
    expect(isWrapMode("column")).toBe(false);
    expect(isWrapMode("")).toBe(false);
    expect(isWrapMode(null)).toBe(false);
  });
});

describe("wrap mode storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads and persists via localStorage", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
      },
    });

    expect(readStoredWrapMode()).toBeNull();
    expect(resolveInitialWrapMode()).toBe("wrap");

    persistWrapMode("nowrap");
    expect(store.get(WRAP_MODE_STORAGE_KEY)).toBe("nowrap");
    expect(readStoredWrapMode()).toBe("nowrap");
    expect(resolveInitialWrapMode()).toBe("nowrap");
  });

  it("ignores invalid stored values", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "nope",
        setItem: () => undefined,
      },
    });
    expect(readStoredWrapMode()).toBeNull();
    expect(resolveInitialWrapMode()).toBe("wrap");
  });

  it("tolerates storage failures", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(readStoredWrapMode()).toBeNull();
    expect(() => persistWrapMode("wrap")).not.toThrow();
  });
});
