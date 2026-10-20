import crypto from "crypto";

const N = 16384, R = 8, P = 1, LEN = 64;

/** scrypt hash, stored as scrypt$N$r$p$salt$hash (base64). */
export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, LEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), h.toString("base64")].join("$");
}

export function verifyPassword(pw: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [kind, n, r, p, salt, hash] = stored.split("$");
  if (kind !== "scrypt") return false;
  const want = Buffer.from(hash, "base64");
  const got = crypto.scryptSync(pw, Buffer.from(salt, "base64"), want.length, { N: Number(n), r: Number(r), p: Number(p) });
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "That password is too long.";
  return null;
}
