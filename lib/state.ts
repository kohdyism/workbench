import { aiEnabled, remainingToday } from "./ai";
import { db } from "./db";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toClient(r: any) {
  return {
    id: r.id,
    accountId: r.account_id,
    provider: r.provider,
    fromName: r.from_name || r.from_email || "Unknown",
    fromEmail: r.from_email || "",
    to: r.to_addr || "",
    subject: r.subject || "(no subject)",
    snippet: r.snippet || "",
    date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
    status: r.status,
    pinned: r.pinned,
    ai: r.ai || null,
    by: r.scored_by,
    draft: r.draft || "",
    delegatedTo: r.delegated_to || "",
    agentsRan: r.agents_ran,
    handledAt: r.handled_at ? new Date(r.handled_at).toISOString() : null,
  };
}

const EMAIL_COLS = `e.id, e.account_id, a.provider, e.from_name, e.from_email, e.to_addr, e.subject, e.snippet, e.date, e.status,
  e.pinned, e.ai, e.scored_by, e.draft, e.delegated_to, e.agents_ran, e.handled_at`;

export async function emailsByIds(userId: string, ids: string[]) {
  if (!ids.length) return [];
  const sql = db();
  const rows = await sql.unsafe(
    `select ${EMAIL_COLS} from emails e join accounts a on a.id = e.account_id where e.user_id = $1 and e.id = any($2)`,
    [userId, ids]
  );
  return rows.map(toClient);
}

export async function loadState(userId: string) {
  const sql = db();
  const [user] = await sql`select id, email, name, settings from users where id = ${userId}`;
  const accounts = await sql`select id, provider, email, error, last_sync from accounts where user_id = ${userId} order by created_at`;
  const emails = await sql.unsafe(
    `select ${EMAIL_COLS} from emails e join accounts a on a.id = e.account_id
     where e.user_id = $1 and (e.status in ('open','ready') or e.handled_at > now() - interval '7 days')
     order by e.date desc limit 1500`,
    [userId]
  );
  const log = await sql`select id, t, actor, text, undoable, undone, agent_id, reason, undo from log where user_id = ${userId} order by t desc limit 200`;
  const queue = await sql`select id, agent_id, email_id, action, param, reason, created_at from queue where user_id = ${userId}`;
  return {
    user: { email: user?.email || "", name: user?.name || "" },
    accounts: accounts.map((a: any) => ({ id: a.id, provider: a.provider, email: a.email, error: a.error, lastSync: a.last_sync })),
    emails: emails.map(toClient),
    settings: user?.settings || {},
    log: log.map((l: any) => ({ id: l.id, t: new Date(l.t).toISOString(), actor: l.actor, text: l.text, undoable: l.undoable, undone: l.undone, agentId: l.agent_id, reason: l.reason, emailIds: (l.undo || []).map((u: any) => u.id) })),
    queue: queue.map((q: any) => ({ id: q.id, agentId: q.agent_id, emailId: q.email_id, action: q.action, param: q.param, reason: q.reason, t: new Date(q.created_at).toISOString() })),
    ai: { enabled: aiEnabled(), remaining: aiEnabled() ? await remainingToday(userId) : 0 },
  };
}
