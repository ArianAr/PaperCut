import { describe, expect, it } from "vitest";
import {
  defaultLevelFilters,
  filterLogLines,
  formatLineHash,
  isLineSelected,
  parseLineHash,
  parseLogLines,
  parseSearchQuery,
  splitRawLines,
} from "./log-lines";

describe("splitRawLines / parseLogLines", () => {
  it("splits without double-counting trailing newline", () => {
    expect(splitRawLines("a\nb")).toEqual(["a", "b"]);
    expect(splitRawLines("a\nb\n")).toEqual(["a", "b"]);
    expect(splitRawLines("")).toEqual([]);
  });

  it("detects levels and JSON", () => {
    const lines = parseLogLines(
      ['[INFO] hi', '{"a":1}', "\u001b[31m[ERROR]\u001b[0m x"].join("\n"),
    );
    expect(lines).toHaveLength(3);
    expect(lines[0]!.level).toBe("INFO");
    expect(lines[0]!.lineNumber).toBe(1);
    expect(lines[1]!.isJson).toBe(true);
    expect(lines[1]!.jsonValue).toEqual({ a: 1 });
    expect(lines[2]!.level).toBe("ERROR");
    expect(lines[2]!.plain).toContain("[ERROR]");
    expect(lines[2]!.plain).not.toContain("\u001b");
  });
});

describe("parseSearchQuery / filterLogLines", () => {
  const lines = parseLogLines(
    ["[INFO] alpha", "[ERROR] beta", "gamma noise"].join("\n"),
  );

  it("filters by substring", () => {
    const q = parseSearchQuery("beta");
    const filtered = filterLogLines(lines, defaultLevelFilters(), q);
    expect(filtered.map((l) => l.lineNumber)).toEqual([2]);
  });

  it("filters by regex /pattern/", () => {
    const q = parseSearchQuery("/alp|gam/i");
    expect(q.mode).toBe("regex");
    expect(q.error).toBeNull();
    const filtered = filterLogLines(lines, defaultLevelFilters(), q);
    expect(filtered.map((l) => l.lineNumber)).toEqual([1, 3]);
  });

  it("filters by log level toggles", () => {
    const levels = defaultLevelFilters();
    levels.INFO = false;
    levels.UNKNOWN = false;
    const filtered = filterLogLines(lines, levels, parseSearchQuery(""));
    expect(filtered.map((l) => l.level)).toEqual(["ERROR"]);
  });

  it("reports invalid regex without throwing", () => {
    const q = parseSearchQuery("/(/");
    expect(q.mode).toBe("regex");
    expect(q.regex).toBeNull();
    expect(q.error).toBeTruthy();
  });
});

describe("line hash selection", () => {
  it("parses #L12 and ranges", () => {
    expect(parseLineHash("#L12")).toEqual({ start: 12, end: 12 });
    expect(parseLineHash("L1-L5")).toEqual({ start: 1, end: 5 });
    expect(parseLineHash("#L10-L3")).toEqual({ start: 3, end: 10 });
    expect(parseLineHash("#foo")).toBeNull();
  });

  it("formats and tests selection membership", () => {
    expect(formatLineHash({ start: 2, end: 2 })).toBe("#L2");
    expect(formatLineHash({ start: 2, end: 5 })).toBe("#L2-L5");
    expect(isLineSelected(3, { start: 2, end: 5 })).toBe(true);
    expect(isLineSelected(9, { start: 2, end: 5 })).toBe(false);
  });
});
