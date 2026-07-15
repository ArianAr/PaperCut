import { describe, expect, it } from "vitest";
import {
  buildCompareSearch,
  isValidPasteId,
  normalizeCompareId,
  parseComparePasteResponse,
} from "./compare";

describe("paste id validation", () => {
  it("accepts nanoid-like ids", () => {
    expect(isValidPasteId("V1StGXR8_Z5a")).toBe(true);
    expect(normalizeCompareId("  abcdefghijkl  ")).toBe("abcdefghijkl");
  });

  it("rejects short or weird ids", () => {
    expect(isValidPasteId("ab")).toBe(false);
    expect(normalizeCompareId("../x")).toBeNull();
    expect(normalizeCompareId("")).toBeNull();
  });
});

describe("buildCompareSearch", () => {
  it("sets and clears compare param", () => {
    expect(buildCompareSearch("", "abc123def456")).toBe("?compare=abc123def456");
    expect(buildCompareSearch("?foo=1", "abc123def456")).toBe(
      "?foo=1&compare=abc123def456",
    );
    expect(buildCompareSearch("?compare=old&x=1", null)).toBe("?x=1");
  });
});

describe("parseComparePasteResponse", () => {
  it("parses success", () => {
    const r = parseComparePasteResponse(
      200,
      { id: "abc123def456", rawContent: "hi", createdAt: 1, expiresAt: null },
      "abc123def456",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rawContent).toBe("hi");
  });

  it("handles locked and missing", () => {
    const locked = parseComparePasteResponse(401, {}, "x");
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.locked).toBe(true);
    expect(parseComparePasteResponse(404, {}, "x").ok).toBe(false);
  });
});
