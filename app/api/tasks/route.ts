import { rid } from "@/lib/crypto";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";
import { taskToClient } from "@/lib/state";

export const dynamic = "force-dynamic";

type In = { id?: string; emailId?: string | null; title?: string; notes?: string; due?: string | null; status?: string; source?: string; key?: string | null };

/** Creates or updates one task. Tasks only exist once the user has made or approved them. */
export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  const { task: t } = await readJson<{ task: In }>(req, 20_000);
  if (!t) throw new HttpError(400, "Task missing");
  const title = String(t.title || "").trim().slice(0, 200);
  const status = ["open", "done", "dismissed"].includes(String(t.status)) ? String(t.status) : "open";
  if (!title && status !== "dismissed") throw new HttpError(400, "Give the task a title.");
  const due = t.due && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : null;
  const sql = db();
  let emailId: string | null = null;
  if (t.emailId) {
    const [e] = await sql`select id from emails where id = ${t.emailId} and user_id = ${userId}`;
    emailId = e ? e.id : null;
  }
  const id = t.id && /^[\w-]{4,40}$/.test(t.id) ? t.id : rid(10);
  const [row] = await sql`
    insert into tasks (id, user_id, email_id, title, notes, due, status, source, key, done_at)
    values (${id}, ${userId}, ${emailId}, ${title || "(dismissed)"}, ${String(t.notes || "").slice(0, 4000)}, ${due}, ${status},
      ${t.source === "ai" ? "ai" : "user"}, ${t.key ? String(t.key).slice(0, 80) : null}, ${status === "done" ? new Date().toISOString() : null})
    on conflict (id) do update set title = excluded.title, notes = excluded.notes, due = excluded.due, status = excluded.status,
      email_id = excluded.email_id,
      done_at = case when excluded.status = 'done' then coalesce(tasks.done_at, now()) else null end
    where tasks.user_id = ${userId}
    returning *`;
  if (!row) throw new HttpError(404, "Task not found");
  return Response.json({ task: taskToClient(row) });
});
