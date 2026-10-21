import { rid } from "@/lib/crypto";
import { db } from "@/lib/db";
import { ARCHIVED, firstName, loadForAction, target, type EmailRow } from "@/lib/mailbox";
import { pool } from "@/lib/mime";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";
import { emailsByIds } from "@/lib/state";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = { ids: string[]; action: string; param?: string; actor?: string; text?: string; agentId?: string; reason?: string; params?: Record<string, string> };

const ACTIONS = ["read", "done", "letgo", "delegate", "pin", "reply", "send", "project", "reopen", "agentsran"];
const AUTO_SEND_MAX_IMPORTANCE = 4;
const isEmail = (s: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);

const snap = (r: EmailRow) => ({
  id: r.id,
  status: r.status,
  pinned: r.pinned,
  draft: r.draft,
  delegated_to: r.delegated_to,
  handled_at: r.handled_at,
  project: r.ai?.project ?? null,
});

export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  const b = await readJson<Body>(req);
  const ids = Array.isArray(b.ids) ? b.ids.filter((x) => typeof x === "string").slice(0, 500) : [];
  if (!ids.length || !ACTIONS.includes(b.action)) throw new HttpError(400, "Nothing to do");
  const actor = (b.actor || "You").slice(0, 60);
  const param = String(b.param || "").slice(0, 10000);
  const sql = db();

  if (b.action === "read") {
    const { rows, tokenFor, providerOf } = await loadForAction(userId, ids);
    await pool(rows.filter((r) => r.unread), 4, async (r) => {
      try { await providerOf(r).markRead(await tokenFor(r.account_id), target(r)); } catch { /* still mark it read here */ }
    });
    await sql`update emails set unread = false where user_id = ${userId} and id = any(${ids})`;
    return Response.json({ emails: await emailsByIds(userId, ids), log: null, failed: [] });
  }
  if (b.action === "agentsran") {
    await sql`update emails set agents_ran = true where user_id = ${userId} and id = any(${ids})`;
    return Response.json({ emails: await emailsByIds(userId, ids), log: null, failed: [] });
  }
  if (b.action === "delegate" && !b.params && !isEmail(param)) throw new HttpError(400, "Delegate needs a colleague's email address");
  if ((b.action === "reply" || b.action === "send") && !param.trim() && !b.params) throw new HttpError(400, "The reply is empty");

  const { rows, tokenFor, providerOf } = await loadForAction(userId, ids);
  const before = rows.map(snap);
  const failed: { id: string; error: string }[] = [];
  const done: string[] = [];

  await pool(rows, 4, async (r) => {
    try {
      // Agents may only send automatically to low-importance mail. People sending by hand are not limited.
      if (b.action === "send" && actor !== "You" && Number(r.ai?.i ?? 10) > AUTO_SEND_MAX_IMPORTANCE) {
        throw new Error("Agents can only send replies to low-importance email");
      }
      const token = await tokenFor(r.account_id);
      const mail = providerOf(r);
      const t = target(r);
      const now = new Date().toISOString();
      const own = b.params && typeof b.params[r.id] === "string" ? String(b.params[r.id]).slice(0, 10000) : param;
      const text = own.replace(/\{first\}/g, firstName(r.from_name || r.from_email));
      let providerId = r.provider_id as string;
      const archiveOnce = async () => {
        if (!ARCHIVED.includes(r.status)) providerId = await mail.archive(token, t);
      };
      switch (b.action) {
        case "done":
          await archiveOnce();
          await sql`update emails set status = 'done', handled_at = ${now}, provider_id = ${providerId} where id = ${r.id}`;
          break;
        case "letgo":
          await mail.label(token, t, "Workbench/Let go").catch(() => undefined);
          await archiveOnce();
          await sql`update emails set status = 'letgo', handled_at = ${now}, provider_id = ${providerId} where id = ${r.id}`;
          break;
        case "delegate":
          if (!isEmail(own)) throw new Error("Delegate needs a colleague's email address");
          await mail.forward(token, t, own, b.text || "Could you take this one, please? Thanks.");
          await archiveOnce();
          await sql`update emails set status = 'delegated', delegated_to = ${own}, handled_at = ${now}, provider_id = ${providerId} where id = ${r.id}`;
          break;
        case "pin":
          await mail.setPinned(token, t, !r.pinned);
          await sql`update emails set pinned = ${!r.pinned} where id = ${r.id}`;
          break;
        case "reply":
          await mail.draftReply(token, t, text);
          await sql`update emails set status = 'ready', draft = ${text} where id = ${r.id}`;
          break;
        case "send":
          await mail.sendReply(token, t, text);
          await archiveOnce();
          await sql`update emails set status = 'sent', draft = ${text}, handled_at = ${now}, provider_id = ${providerId} where id = ${r.id}`;
          break;
        case "project":
          await mail.label(token, t, `Workbench/${own}`).catch(() => undefined);
          await sql`update emails set ai = jsonb_set(coalesce(ai, '{}'::jsonb), '{project}', to_jsonb(${own}::text)) where id = ${r.id}`;
          break;
        case "reopen":
          if (ARCHIVED.includes(r.status)) providerId = await mail.unarchive(token, t);
          await sql`update emails set status = 'open', delegated_to = '', handled_at = null, provider_id = ${providerId} where id = ${r.id}`;
          break;
      }
      done.push(r.id);
    } catch (e) {
      failed.push({ id: r.id, error: (e as Error).message.slice(0, 160) });
    }
  });

  let log = null;
  if (done.length) {
    const verb: Record<string, string> = {
      done: "Done", letgo: "Let go", delegate: "Delegated", pin: "Pinned or unpinned", reply: "Saved a draft reply to",
      send: "Sent a reply to", project: "Filed", reopen: "Reopened",
    };
    const one = rows.find((r) => r.id === done[0]);
    const what = done.length === 1 ? `“${one?.subject || "email"}”` : `${done.length} emails`;
    const text = b.text && b.action !== "delegate" && b.action !== "send"
      ? b.text.slice(0, 200)
      : `${verb[b.action]} ${what}${b.action === "delegate" ? ` to ${param}` : b.action === "project" ? ` under ${param}` : ""}`;
    const undoable = b.action !== "send" && b.action !== "delegate";
    const id = rid(10);
    const undo = before.filter((s) => done.includes(s.id));
    const agentId = b.agentId ? String(b.agentId).slice(0, 40) : null;
    const reason = b.reason ? String(b.reason).slice(0, 300) : null;
    await sql`insert into log (id, user_id, actor, text, undo, undoable, agent_id, reason)
      values (${id}, ${userId}, ${actor}, ${text}, ${sql.json(undo)}, ${undoable}, ${agentId}, ${reason})`;
    log = { id, t: new Date().toISOString(), actor, text, undoable, undone: false, agentId, reason, emailIds: done };
  }
  return Response.json({ emails: await emailsByIds(userId, ids), log, failed });
});
