import { afterEach, describe, expect, it } from "vitest";
import { buildPasteUrl } from "./urls";

const prev = process.env.PAPERCUT_PUBLIC_URL;

afterEach(() => {
  if (prev === undefined) delete process.env.PAPERCUT_PUBLIC_URL;
  else process.env.PAPERCUT_PUBLIC_URL = prev;
});

describe("buildPasteUrl", () => {
  it("prefers configured public URL", () => {
    process.env.PAPERCUT_PUBLIC_URL = "https://paste.example";
    expect(buildPasteUrl("abc", "http://localhost:3000/api/pastes")).toBe(
      "https://paste.example/paste/abc",
    );
  });

  it("falls back to request origin", () => {
    delete process.env.PAPERCUT_PUBLIC_URL;
    expect(buildPasteUrl("xyz", "http://localhost:3000/api/pastes")).toBe(
      "http://localhost:3000/paste/xyz",
    );
  });
});
