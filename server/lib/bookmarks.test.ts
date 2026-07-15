import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bookmarksStorageKey,
  isBookmarked,
  normalizeBookmarks,
  persistBookmarks,
  readStoredBookmarks,
  toggleBookmark,
} from "./bookmarks";

describe("normalizeBookmarks", () => {
  it("dedupes, drops invalid, sorts", () => {
    expect(normalizeBookmarks([3, 1, 2, 1, 0, -1, 2.5, 4])).toEqual([1, 2, 3, 4]);
    expect(normalizeBookmarks([])).toEqual([]);
  });
});

describe("toggleBookmark", () => {
  it("adds and removes lines", () => {
    expect(toggleBookmark([], 5)).toEqual([5]);
    expect(toggleBookmark([1, 5], 5)).toEqual([1]);
    expect(toggleBookmark([1, 5], 3)).toEqual([1, 3, 5]);
  });

  it("ignores invalid line numbers", () => {
    expect(toggleBookmark([1], 0)).toEqual([1]);
    expect(toggleBookmark([1], 1.5)).toEqual([1]);
  });
});

describe("isBookmarked", () => {
  it("works with arrays and sets", () => {
    expect(isBookmarked([1, 3], 3)).toBe(true);
    expect(isBookmarked([1, 3], 2)).toBe(false);
    expect(isBookmarked(new Set([1, 3]), 1)).toBe(true);
  });
});

describe("bookmarks storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads and persists per paste id", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });

    expect(bookmarksStorageKey("abc")).toBe("papercut-bookmarks:abc");
    expect(readStoredBookmarks("abc")).toEqual([]);

    persistBookmarks("abc", [10, 2, 10]);
    expect(store.get("papercut-bookmarks:abc")).toBe("[2,10]");
    expect(readStoredBookmarks("abc")).toEqual([2, 10]);

    persistBookmarks("abc", []);
    expect(store.has("papercut-bookmarks:abc")).toBe(false);
  });

  it("tolerates corrupt storage", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "not-json",
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => undefined,
      },
    });
    expect(readStoredBookmarks("x")).toEqual([]);
    expect(() => persistBookmarks("x", [1])).not.toThrow();
  });

  it("ignores non-array JSON", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => '{"a":1}',
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    });
    expect(readStoredBookmarks("x")).toEqual([]);
  });
});
