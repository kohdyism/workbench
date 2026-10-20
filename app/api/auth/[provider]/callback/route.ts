import { cookies } from "next/headers";
import { db, ready } from "@/lib/db";
import { encrypt, rid } from "@/lib/crypto";
import { appUrl, exchangeCode, isProvider, profile } from "@/lib/oauth";
import { createSession, currentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const fail = (code: string) => Response.redirect(`${appUrl()}/?error=${code}`, 302);

export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const p = params.provider;
  if (!isProvider(p)) return fail("unknown_provider");
  const url = new URL(req.url);
  if (url.searchParams.get("error")) return fail("access_denied");
  const raw = cookies().get("wb_oauth")?.value;
  cookies().delete({ name: "wb_oauth", path: "/api/auth" });
  let saved: { state?: string; verifier?: string; p?: string } = {};
  try {
    saved = JSON.parse(raw || "{}");
  } catch {}
  const code = url.searchParams.get("code");
  if (!code || !saved.state || saved.state !== url.searchParams.get("state") || saved.p !== p || !saved.verifier) {
    return fail("state_mismatch");
  }

  try {
    await ready();
    const sql = db();
    const tokens = await exchangeCode(p, code, saved.verifier);
    const me = await profile(p, tokens.access_token);
    if (!me.email) return fail("no_email");

    // Link to the signed-in user, or to whoever already owns this mailbox, or create a user.
    let userId = await currentUserId();
    if (userId) {
      const [u] = await sql`select id from users where id = ${userId}`;
      if (!u) userId = null;
    }
    const [owner] = await sql`select user_id from accounts where provider = ${p} and email = ${me.email} limit 1`;
    if (userId && owner && owner.user_id !== userId) return fail("already_linked");
    if (!userId) {
      const [u] = owner ? [] : await sql`select id from users where email = ${me.email}`;
      userId = owner?.user_id || u?.id || null;
    }
    if (!userId) {
      userId = rid(10);
      await sql`insert into users (id, email, name) values (${userId}, ${me.email}, ${me.name.slice(0, 80)})`;
    }

    const exp = Date.now() + tokens.expires_in * 1000;
    const refresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
    await sql`
      insert into accounts (id, user_id, provider, email, access_token, refresh_token, expires_at)
      values (${rid(10)}, ${userId}, ${p}, ${me.email}, ${encrypt(tokens.access_token)}, ${refresh}, ${exp})
      on conflict (user_id, provider, email) do update set
        access_token = excluded.access_token,
        refresh_token = coalesce(excluded.refresh_token, accounts.refresh_token),
        expires_at = excluded.expires_at,
        error = null`;
    await createSession(userId);
    return Response.redirect(`${appUrl()}/?connected=${p}`, 302);
  } catch (e) {
    console.error("OAuth callback failed", e);
    return fail("connect_failed");
  }
}
