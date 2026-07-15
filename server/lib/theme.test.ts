import { describe, expect, it } from "vitest";
import { isTheme, THEME_STORAGE_KEY } from "./theme";

describe("theme helpers", () => {
  it("accepts only dark and light", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("auto")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("uses a stable storage key", () => {
    expect(THEME_STORAGE_KEY).toBe("papercut-theme");
  });
});
