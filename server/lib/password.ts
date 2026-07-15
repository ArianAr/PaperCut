import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 } as const;

/**
 * Hash a password with scrypt. Format: `scrypt$<salt_b64>$<hash_b64>`
 */
export function hashPassword(password: string): string {
  if (!password) {
    throw new Error("Password must not be empty");
  }
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

/**
 * Verify a password against a stored hash. Returns false for malformed hashes.
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (!password || !stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  try {
    const salt = Buffer.from(parts[1]!, "base64url");
    const expected = Buffer.from(parts[2]!, "base64url");
    const actual = scryptSync(password, salt, expected.length, SCRYPT_OPTS);
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
