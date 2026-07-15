import { describe, expect, it } from "vitest";
import { isTheme, THEME_BOOT_SCRIPT, THEME_STORAGE_KEY } from "./theme";

describe("theme helpers", () => {
  it("accepts only dark and light", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("auto")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("uses a stable storage key shared by the FOUC boot script", () => {
    expect(THEME_STORAGE_KEY).toBe("papercut-theme");
    // Boot script embeds the key as a static literal (no code construction).
    expect(THEME_BOOT_SCRIPT).toContain(`localStorage.getItem("${THEME_STORAGE_KEY}")`);
    expect(THEME_BOOT_SCRIPT).toContain('setAttribute("data-theme"');
  });
});
