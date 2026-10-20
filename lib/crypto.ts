import crypto from "crypto";

function key(): Buffer {
  const k = Buffer.from(process.env.ENCRYPTION_KEY || "", "base64");
  if (k.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 random bytes, base64-encoded");
  return k;
}

/** AES-256-GCM. Output: iv.tag.ciphertext, each base64. Used for OAuth tokens at rest. */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), ct].map((b) => b.toString("base64")).join(".");
}

export function decrypt(packed: string): string {
  const [iv, tag, ct] = packed.split(".").map((x) => Buffer.from(x, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

export const rid = (n = 12) => crypto.randomBytes(n).toString("base64url");
