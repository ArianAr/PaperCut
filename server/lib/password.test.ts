import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("hashes and verifies correct password", () => {
    const hash = hashPassword("s3cret!");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("s3cret!", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("uses unique salts", () => {
    const a = hashPassword("same");
    const b = hashPassword("same");
    expect(a).not.toBe(b);
    expect(verifyPassword("same", a)).toBe(true);
    expect(verifyPassword("same", b)).toBe(true);
  });

  it("rejects empty password on hash", () => {
    expect(() => hashPassword("")).toThrow(/empty/i);
  });

  it("returns false for malformed stored hashes", () => {
    expect(verifyPassword("x", "not-a-hash")).toBe(false);
    expect(verifyPassword("x", "scrypt$onlyone")).toBe(false);
    expect(verifyPassword("", "scrypt$a$b")).toBe(false);
  });
});
