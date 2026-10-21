import { aiEnabled, scoreEmails, spend, type ScoreIn } from "@/lib/ai";
import { rid } from "@/lib/crypto";
import { db } from "@/lib/db";
import { accessToken, ReconnectError, type AccountRow } from "@/lib/oauth";
import { MAIL } from "@/lib/providers";
import { pool } from "@/lib/mime";
import { handle, requireUser } from "@/lib/session";
import { loadState } from "@/lib/state";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAYS = () => Number(process.env.SYNC_DAYS || 14);
const MAX = () => Math.min(100, Number(process.env.SYNC_MAX || 60));
const SCORE_PER_SYNC = 30;

export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  const sql = db();
  const accounts = (await sql`select * from accounts where user_id = ${userId}`) as unknown as AccountRow[];
  const problems: { account: string; error: string }[] = [];
  let added = 0;

  // 1. Pull new inbox mail from every connected mailbox.
  for (const a of accounts) {
    try {
      const token = await accessToken(a);
      const knownRows = await sql`select provider_id from emails where account_id = ${a.id}`;
      const known = new Set<string>(knownRows.map((r) => r.provider_id as string));
      const incoming = await MAIL[a.provider].list(token, { days: DAYS(), max: MAX(), known });
      for (const m of incoming) {
        const res = await sql`
          insert into emails (id, user_id, account_id, provider_id, thread_id, message_id, from_name, from_email,
            to_addr, subject, snippet, body, date, pinned, unread)
          values (${rid(10)}, ${userId}, ${a.id}, ${m.providerId}, ${m.threadId}, ${m.messageId}, ${m.fromName},
            ${m.fromEmail}, ${m.to}, ${m.subject.slice(0, 500)}, ${m.snippet.slice(0, 500)}, ${m.body}, ${m.date}, ${m.pinned}, ${m.unread})
          on conflict (account_id, provider_id) do nothing`;
        added += res.count;
      }
      await sql`update accounts set last_sync = now(), error = null where id = ${a.id}`;
    } catch (e) {
      const msg = e instanceof ReconnectError ? "Reconnect needed" : "Couldn't reach this mailbox";
      problems.push({ account: a.email, error: msg });
      if (!(e instanceof ReconnectError)) console.error("Sync failed for", a.provider, e);
    }
  }

  // 2. Score unscored open mail with Claude, newest first, within the daily allowance.
  let scored = 0;
  let remaining = 0;
  if (aiEnabled()) {
    const pending = await sql`select id, from_name, from_email, date, subject, body, snippet from emails
      where user_id = ${userId} and status = 'open' and scored_by <> 'ai' order by date desc limit ${SCORE_PER_SYNC}`;
    const grant = await spend(userId, pending.length);
    const take = pending.slice(0, grant);
    const [u] = await sql`select settings from users where id = ${userId}`;
    const settings = (u?.settings || {}) as { about?: string; context?: string };
    const projRows = await sql`select distinct ai->>'project' as p from emails where user_id = ${userId} and ai is not null`;
    const projects = projRows.map((r) => r.p as string).filter((p) => p && p !== "General").slice(0, 40);
    const batches: ScoreIn[][] = [];
    for (let i = 0; i < take.length; i += 10) {
      batches.push(
        take.slice(i, i + 10).map((r) => ({
          id: r.id,
          fromName: r.from_name || "",
          fromEmail: r.from_email || "",
          date: r.date ? new Date(r.date).toISOString() : "",
          subject: r.subject || "",
          body: r.body || r.snippet || "",
        }))
      );
    }
    await pool(batches, 3, async (b) => {
      try {
        const res = await scoreEmails(b, settings, projects);
        for (const [id, ai] of res) {
          await sql`update emails set ai = ${sql.json(ai)}, scored_by = 'ai' where id = ${id} and user_id = ${userId}`;
          scored++;
        }
      } catch (e) {
        console.error("Scoring batch failed", e);
      }
    });
    const [{ n }] = await sql`select count(*)::int as n from emails where user_id = ${userId} and status = 'open' and scored_by <> 'ai'`;
    remaining = grant < pending.length ? 0 : n; // stop the client loop once the allowance runs out
  }

  return Response.json({ added, scored, remaining, problems, state: await loadState(userId) });
});
