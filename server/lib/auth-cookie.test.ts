import { describe, expect, it } from "vitest";
import {
  authCookieName,
  createUnlockToken,
  verifyUnlockToken,
} from "./auth-cookie";

const SECRET = "test-secret-value";

describe("auth-cookie", () => {
  it("names cookies with paste id", () => {
    expect(authCookieName("abc123")).toBe("pc_auth_abc123");
  });

  it("round-trips a valid token", () => {
    const now = 1_700_000_000_000;
    const token = createUnlockToken("paste1", {
      now,
      ttlMs: 60_000,
      secret: SECRET,
    });
    expect(
      verifyUnlockToken("paste1", token, { now: now + 1000, secret: SECRET }),
    ).toBe(true);
  });

  it("rejects wrong paste id, tampering, and expiry", () => {
    const now = 1_700_000_000_000;
    const token = createUnlockToken("paste1", {
      now,
      ttlMs: 60_000,
      secret: SECRET,
    });

    expect(
      verifyUnlockToken("other", token, { now, secret: SECRET }),
    ).toBe(false);

    const tampered = token.slice(0, -2) + "xx";
    expect(
      verifyUnlockToken("paste1", tampered, { now, secret: SECRET }),
    ).toBe(false);

    expect(
      verifyUnlockToken("paste1", token, {
        now: now + 120_000,
        secret: SECRET,
      }),
    ).toBe(false);

    expect(verifyUnlockToken("paste1", undefined, { secret: SECRET })).toBe(
      false,
    );
  });

  it("rejects tokens signed with a different secret", () => {
    const token = createUnlockToken("paste1", { secret: SECRET });
    expect(
      verifyUnlockToken("paste1", token, { secret: "other-secret" }),
    ).toBe(false);
  });
});
