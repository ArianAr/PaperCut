import { describe, expect, it } from "vitest";
import {
  computeMetadata,
  detectLogLevel,
  looksLikeJsonLine,
  stripAnsi,
} from "./metadata";

describe("stripAnsi", () => {
  it("removes CSI color sequences", () => {
    expect(stripAnsi("\u001b[31merror\u001b[0m")).toBe("error");
  });
});

describe("detectLogLevel", () => {
  it("detects bracketed and bare levels", () => {
    expect(detectLogLevel("[ERROR] boom")).toBe("ERROR");
    expect(detectLogLevel("WARN something")).toBe("WARN");
    expect(detectLogLevel("WARNING deprecated")).toBe("WARN");
    expect(detectLogLevel("[INFO] ok")).toBe("INFO");
    expect(detectLogLevel("debug detail")).toBe("DEBUG");
    expect(detectLogLevel("FATAL crash")).toBe("FATAL");
    expect(detectLogLevel("plain line")).toBe("UNKNOWN");
  });

  it("ignores ANSI when matching levels", () => {
    expect(detectLogLevel("\u001b[31m[ERROR]\u001b[0m fail")).toBe("ERROR");
  });
});

describe("looksLikeJsonLine", () => {
  it("accepts valid objects and arrays", () => {
    expect(looksLikeJsonLine('{"a":1}')).toBe(true);
    expect(looksLikeJsonLine("[1,2]")).toBe(true);
  });

  it("rejects non-json", () => {
    expect(looksLikeJsonLine("not json")).toBe(false);
    expect(looksLikeJsonLine("{nope")).toBe(false);
    expect(looksLikeJsonLine("")).toBe(false);
  });
});

describe("computeMetadata", () => {
  it("counts lines without double-counting trailing newline", () => {
    expect(computeMetadata("a\nb").lineCount).toBe(2);
    expect(computeMetadata("a\nb\n").lineCount).toBe(2);
    expect(computeMetadata("").lineCount).toBe(0);
    expect(computeMetadata("solo").lineCount).toBe(1);
  });

  it("aggregates levels and json flags", () => {
    const content = [
      "[INFO] start",
      "[ERROR] fail",
      '{"level":"info","msg":"hi"}',
      "noise",
    ].join("\n");
    const meta = computeMetadata(content);
    expect(meta.levels.INFO).toBe(1);
    expect(meta.levels.ERROR).toBe(1);
    expect(meta.levels.UNKNOWN).toBe(2);
    expect(meta.hasJsonLines).toBe(true);
    expect(meta.byteLength).toBe(Buffer.byteLength(content, "utf8"));
  });
});
