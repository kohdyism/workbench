import { db } from "@/lib/db";
import { handle, readJson, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Item = { id: string; agentId: string; emailId: string };

export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  const b = await readJson<{ add?: Item[]; remove?: string[]; clear?: boolean }>(req);
  const sql = db();
  if (b.clear) await sql`delete from queue where user_id = ${userId}`;
  const remove = (b.remove || []).filter((x) => typeof x === "string");
  if (remove.length) await sql`delete from queue where user_id = ${userId} and id = any(${remove})`;
  for (const q of (b.add || []).slice(0, 500)) {
    await sql`insert into queue (id, user_id, agent_id, email_id)
      select ${q.id}, ${userId}, ${q.agentId}, id from emails where id = ${q.emailId} and user_id = ${userId}
      on conflict (id) do nothing`;
  }
  return Response.json({ ok: true });
});
