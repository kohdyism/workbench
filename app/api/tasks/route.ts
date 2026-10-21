import { rid } from "@/lib/crypto";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";
import { taskToClient } from "@/lib/state";

export const dynamic = "force-dynamic";

type In = { id?: string; emailId?: string | null; emailIds?: string[]; title?: string; notes?: string; due?: string | null; status?: string; source?: string; key?: string | null };

/** Creates or updates one task. Tasks only exist once the user has made or approved them. */
export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  const { task: t } = await readJson<{ task: In }>(req, 20_000);
  if (!t) throw new HttpError(400, "Task missing");
  const title = String(t.title || "").trim().slice(0, 200);
  const status = ["open", "in_progress", "done", "dismissed"].includes(String(t.status)) ? String(t.status) : "open";
  if (!title && status !== "dismissed") throw new HttpError(400, "Give the task a title.");
  const due = t.due && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : null;
  const sql = db();
  const wanted = [...new Set([...(Array.isArray(t.emailIds) ? t.emailIds : []), ...(t.emailId ? [t.emailId] : [])].filter((x) => typeof x === "string"))].slice(0, 50);
  const found = wanted.length ? await sql`select id from emails where user_id = ${userId} and id = any(${wanted})` : [];
  const ok = new Set(found.map((r) => r.id as string));
  const emailIds = wanted.filter((id) => ok.has(id));
  const emailId: string | null = emailIds[0] || null;
  const id = t.id && /^[\w-]{4,40}$/.test(t.id) ? t.id : rid(10);
  const [row] = await sql`
    insert into tasks (id, user_id, email_id, email_ids, title, notes, due, status, source, key, done_at)
    values (${id}, ${userId}, ${emailId}, ${sql.json(emailIds)}, ${title || "(dismissed)"}, ${String(t.notes || "").slice(0, 8000)}, ${due}, ${status},
      ${t.source === "ai" ? "ai" : "user"}, ${t.key ? String(t.key).slice(0, 80) : null}, ${status === "done" ? new Date().toISOString() : null})
    on conflict (id) do update set title = excluded.title, notes = excluded.notes, due = excluded.due, status = excluded.status,
      email_id = excluded.email_id, email_ids = excluded.email_ids,
      done_at = case when excluded.status = 'done' then coalesce(tasks.done_at, now()) else null end
    where tasks.user_id = ${userId}
    returning *`;
  if (!row) throw new HttpError(404, "Task not found");
  return Response.json({ task: taskToClient(row) });
});
