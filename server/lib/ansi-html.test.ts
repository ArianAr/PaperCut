import { describe, expect, it } from "vitest";
import { ansiToHtml, clearAnsiCache } from "./ansi-html";

describe("ansiToHtml", () => {
  it("renders ANSI colors as spans and escapes HTML", () => {
    clearAnsiCache();
    const html = ansiToHtml("\u001b[31mred\u001b[0m <script>x</script>");
    expect(html).toMatch(/span/i);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("caches repeated lines", () => {
    clearAnsiCache();
    const a = ansiToHtml("same");
    const b = ansiToHtml("same");
    expect(a).toBe(b);
  });
});
