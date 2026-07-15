import { describe, expect, it } from "vitest";
import { parseLogLines } from "./log-lines";
import {
  buildTimelineIndex,
  extractTimestampMs,
  formatTimelineTime,
  nearestTimelinePoint,
  scrubToTimeMs,
} from "./timestamps";

describe("extractTimestampMs", () => {
  it("parses ISO 8601", () => {
    const ms = extractTimestampMs("2024-06-01T12:00:00.000Z start");
    expect(ms).toBe(Date.parse("2024-06-01T12:00:00.000Z"));
  });

  it("parses date space time as UTC", () => {
    const ms = extractTimestampMs("2024-06-01 12:00:00 hello");
    expect(ms).toBe(Date.parse("2024-06-01T12:00:00.000Z"));
  });

  it("parses unix epoch seconds and ms", () => {
    expect(extractTimestampMs("[1717243200] event")).toBe(1717243200 * 1000);
    expect(extractTimestampMs(" 1717243200123 ")).toBe(1717243200123);
  });

  it("parses syslog with fallback year", () => {
    const ms = extractTimestampMs("Jun  1 12:00:00 host app:", 2024);
    expect(ms).toBe(Date.UTC(2024, 5, 1, 12, 0, 0));
  });

  it("returns null when none found", () => {
    expect(extractTimestampMs("no time here")).toBeNull();
  });
});

describe("buildTimelineIndex / nearest / scrub", () => {
  const lines = parseLogLines(
    [
      "2024-01-01T00:00:00Z first",
      "noise",
      "2024-01-01T00:10:00Z middle",
      "2024-01-01T00:20:00Z last",
    ].join("\n"),
  );

  it("builds index when >= 2 timestamps", () => {
    const index = buildTimelineIndex(lines);
    expect(index).not.toBeNull();
    expect(index!.points).toHaveLength(3);
    expect(index!.minMs).toBe(Date.parse("2024-01-01T00:00:00Z"));
    expect(index!.maxMs).toBe(Date.parse("2024-01-01T00:20:00Z"));
  });

  it("returns null with fewer than 2 timestamps", () => {
    const one = parseLogLines("2024-01-01T00:00:00Z only\nplain");
    expect(buildTimelineIndex(one)).toBeNull();
  });

  it("finds nearest point and scrub mapping", () => {
    const index = buildTimelineIndex(lines)!;
    const mid = nearestTimelinePoint(
      index,
      Date.parse("2024-01-01T00:09:00Z"),
    );
    expect(mid.lineNumber).toBe(3);

    expect(scrubToTimeMs(index, 0)).toBe(index.minMs);
    expect(scrubToTimeMs(index, 1)).toBe(index.maxMs);
    expect(scrubToTimeMs(index, 0.5)).toBe(
      index.minMs + 0.5 * (index.maxMs - index.minMs),
    );
  });

  it("formats labels", () => {
    expect(formatTimelineTime(Date.parse("2024-01-01T00:00:00.000Z"))).toContain(
      "2024-01-01",
    );
  });
});
