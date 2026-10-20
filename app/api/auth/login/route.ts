import { db, ready } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, handle, HttpError, readJson } from "@/lib/session";

export const dynamic = "force-dynamic";

const attempts = new Map<string, { n: number; until: number }>();

export const POST = handle(async (req) => {
  const b = await readJson<{ email?: string; password?: string }>(req, 5000);
  const email = String(b.email || "").trim().toLowerCase();
  const a = attempts.get(email);
  if (a && a.until > Date.now()) throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
  await ready();
  const [u] = await db()`select id, password_hash from users where email = ${email}`;
  if (!u || !verifyPassword(String(b.password || ""), u.password_hash)) {
    const n = (a?.n || 0) + 1;
    attempts.set(email, { n, until: n >= 5 ? Date.now() + 5 * 60_000 : 0 });
    throw new HttpError(401, u && !u.password_hash
      ? "This account signs in with Google or Microsoft."
      : "That email and password don't match.");
  }
  attempts.delete(email);
  await createSession(u.id);
  return Response.json({ ok: true });
});
