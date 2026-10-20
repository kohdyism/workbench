import { rid } from "@/lib/crypto";
import { db, ready } from "@/lib/db";
import { hashPassword, passwordProblem } from "@/lib/password";
import { createSession, handle, HttpError, readJson } from "@/lib/session";

export const dynamic = "force-dynamic";

export const POST = handle(async (req) => {
  const b = await readJson<{ name?: string; email?: string; password?: string }>(req, 5000);
  const email = String(b.email || "").trim().toLowerCase();
  const name = String(b.name || "").trim().slice(0, 80);
  const pw = String(b.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email address.");
  const problem = passwordProblem(pw);
  if (problem) throw new HttpError(400, problem);
  await ready();
  const sql = db();
  const [existing] = await sql`select id, password_hash from users where email = ${email}`;
  if (existing) {
    throw new HttpError(409, existing.password_hash
      ? "An account with this email already exists. Sign in instead."
      : "This email already signed in with Google or Microsoft. Use that button to sign in.");
  }
  const id = rid(10);
  await sql`insert into users (id, email, name, password_hash) values (${id}, ${email}, ${name}, ${hashPassword(pw)})`;
  await createSession(id);
  return Response.json({ ok: true });
});
