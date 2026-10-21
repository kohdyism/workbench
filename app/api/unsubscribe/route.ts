import { rid } from "@/lib/crypto";
import { db } from "@/lib/db";
import { loadForAction, target } from "@/lib/mailbox";
import { pool } from "@/lib/mime";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";
import { oneClick, planUnsub } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Result = { sender: string; name: string; method: "one-click" | "email" | "link" | "none"; ok: boolean; url?: string; error?: string };

/** Unsubscribes from the senders of the given emails, once per sender, using what each sender published. */
export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  const b = await readJson<{ ids: string[] }>(req);
  const ids = Array.isArray(b.ids) ? b.ids.filter((x) => typeof x === "string").slice(0, 300) : [];
  if (!ids.length) throw new HttpError(400, "Nothing to unsubscribe from");
  const { rows, tokenFor, providerOf } = await loadForAction(userId, ids);
  const bySender = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const k = `${r.account_id}|${String(r.from_email || "").toLowerCase()}`;
    if (!bySender.has(k)) bySender.set(k, r);
  }
  const results: Result[] = [];
  await pool([...bySender.values()].slice(0, 40), 4, async (r) => {
    const res: Result = { sender: r.from_email, name: r.from_name || r.from_email, method: "none", ok: false };
    try {
      const token = await tokenFor(r.account_id);
      const mail = providerOf(r);
      const info = await mail.unsubInfo(token, target(r));
      const plan = planUnsub(info.header, info.post);
      if (plan.oneClick && (await oneClick(plan.oneClick).catch(() => false))) {
        res.method = "one-click"; res.ok = true;
      } else if (plan.mailto) {
        await mail.sendNew(token, { to: [plan.mailto.to], cc: [], subject: plan.mailto.subject, body: plan.mailto.body });
        res.method = "email"; res.ok = true;
      } else if (plan.link) {
        res.method = "link"; res.url = plan.link;
      }
    } catch (e) {
      res.error = (e as Error).message.slice(0, 160);
    }
    results.push(res);
  });
  const done = results.filter((x) => x.ok).length;
  if (done) {
    await db()`insert into log (id, user_id, actor, text, undo, undoable)
      values (${rid(10)}, ${userId}, 'You', ${`Unsubscribed from ${done} sender${done > 1 ? "s" : ""}`}, ${db().json([])}, false)`;
  }
  return Response.json({ results });
});
