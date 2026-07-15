import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HIGHLIGHT_RULES_STORAGE_KEY,
  compileHighlightRules,
  createHighlightRule,
  escapeHtml,
  highlightPlainText,
  normalizeHighlightRules,
  persistHighlightRules,
  readStoredHighlightRules,
  renderLineHtml,
  sanitizeHighlightFlags,
  validateHighlightPattern,
} from "./highlight-rules";
import { clearAnsiCache } from "./ansi-html";

describe("sanitizeHighlightFlags", () => {
  it("defaults, forces global, dedupes", () => {
    expect(sanitizeHighlightFlags(undefined)).toBe("gi");
    expect(sanitizeHighlightFlags("i")).toBe("gi");
    expect(sanitizeHighlightFlags("gimsuy")).toBe("gimsuy");
    expect(sanitizeHighlightFlags("ii")).toBe("gi");
    // Only valid flag chars kept (y = sticky); invalid stripped
    expect(sanitizeHighlightFlags("xyz")).toBe("gy");
    expect(sanitizeHighlightFlags("!!!")).toBe("gi");
  });
});

describe("validateHighlightPattern", () => {
  it("accepts valid patterns", () => {
    expect(validateHighlightPattern("error")).toEqual({ ok: true });
    expect(validateHighlightPattern("a+b", "i")).toEqual({ ok: true });
  });

  it("rejects empty and invalid", () => {
    expect(validateHighlightPattern("").ok).toBe(false);
    expect(validateHighlightPattern("   ").ok).toBe(false);
    expect(validateHighlightPattern("(").ok).toBe(false);
  });
});

describe("compileHighlightRules", () => {
  it("skips disabled and invalid patterns", () => {
    const rules = [
      createHighlightRule({ id: "a", pattern: "ok", color: "error" }),
      createHighlightRule({ id: "b", pattern: "nope", enabled: false }),
      createHighlightRule({ id: "c", pattern: "(" }),
    ];
    const compiled = compileHighlightRules(rules);
    expect(compiled).toHaveLength(1);
    expect(compiled[0]!.id).toBe("a");
  });
});

describe("escapeHtml / highlightPlainText", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml(`<a & "b">`)).toBe("&lt;a &amp; &quot;b&quot;&gt;");
  });

  it("wraps matches with mark spans", () => {
    const rules = compileHighlightRules([
      createHighlightRule({
        id: "1",
        pattern: "error",
        color: "error",
        flags: "i",
      }),
    ]);
    const { html, matched } = highlightPlainText("got ERROR here", rules);
    expect(matched).toBe(true);
    expect(html).toContain("<mark");
    expect(html).toMatch(/<mark[^>]*>ERROR<\/mark>/);
    expect(html).toContain("got ");
    expect(html).toContain(" here");
  });

  it("earlier rules win on overlap (including nested starts)", () => {
    const sameStart = compileHighlightRules([
      createHighlightRule({ id: "1", pattern: "foobar", color: "error" }),
      createHighlightRule({ id: "2", pattern: "foo", color: "info" }),
    ]);
    const sameStartHtml = highlightPlainText("foobar", sameStart).html;
    expect(sameStartHtml).toContain("bg-vscode-error");
    expect(sameStartHtml).not.toContain("bg-vscode-info");

    // Later rule starts earlier in the string but must lose to earlier rule's match
    const nested = compileHighlightRules([
      createHighlightRule({ id: "1", pattern: "bar", color: "error" }),
      createHighlightRule({ id: "2", pattern: "foobar", color: "info" }),
    ]);
    const nestedHtml = highlightPlainText("foobar", nested).html;
    expect(nestedHtml).toContain("bg-vscode-error");
    expect(nestedHtml).not.toContain("bg-vscode-info");
    expect(nestedHtml).toMatch(/^foo<mark[^>]*>bar<\/mark>$/);
  });

  it("escapes match content", () => {
    const rules = compileHighlightRules([
      createHighlightRule({ id: "1", pattern: "<script>", color: "warn" }),
    ]);
    const { html } = highlightPlainText("x<script>y", rules);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});

describe("renderLineHtml", () => {
  afterEach(() => {
    clearAnsiCache();
  });

  it("uses ANSI when no rules match", () => {
    const rules = compileHighlightRules([
      createHighlightRule({ id: "1", pattern: "nomatch", color: "error" }),
    ]);
    const html = renderLineHtml("\u001b[31mred\u001b[0m", "red", rules);
    expect(html).toContain("red");
    // ansi_up wraps styled text in spans
    expect(html.toLowerCase()).toMatch(/span|style|color/);
  });

  it("uses plain highlights when a rule matches", () => {
    const rules = compileHighlightRules([
      createHighlightRule({ id: "1", pattern: "boom", color: "error" }),
    ]);
    const html = renderLineHtml("[ERROR] boom", "[ERROR] boom", rules);
    expect(html).toContain("<mark");
    expect(html).toContain("boom");
  });
});

describe("storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and reads normalized rules", () => {
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

    const rules = normalizeHighlightRules([
      createHighlightRule({ id: "x", pattern: "foo", color: "info" }),
    ]);
    persistHighlightRules(rules);
    expect(store.has(HIGHLIGHT_RULES_STORAGE_KEY)).toBe(true);
    expect(readStoredHighlightRules()).toEqual(rules);

    persistHighlightRules([]);
    expect(store.has(HIGHLIGHT_RULES_STORAGE_KEY)).toBe(false);
  });
});
