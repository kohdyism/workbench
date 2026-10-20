import { db } from "@/lib/db";
import { ARCHIVED, loadForAction, target } from "@/lib/mailbox";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";
import { emailsByIds } from "@/lib/state";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Snap = { id: string; status: string; pinned: boolean; draft: string; delegated_to: string; handled_at: string | null; project: string | null };

export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  const { logId } = await readJson<{ logId: string }>(req);
  const sql = db();
  const [entry] = await sql`select * from log where id = ${logId} and user_id = ${userId}`;
  if (!entry) throw new HttpError(404, "That action is no longer in your history");
  if (entry.undone) throw new HttpError(409, "Already undone");
  if (!entry.undoable) throw new HttpError(409, "Sent or forwarded email can't be unsent");
  const snaps = (entry.undo || []) as Snap[];
  const { rows, tokenFor, providerOf } = await loadForAction(userId, snaps.map((s) => s.id));
  const failed: string[] = [];
  for (const s of snaps) {
    const r = rows.find((x) => x.id === s.id);
    if (!r) continue;
    try {
      const token = await tokenFor(r.account_id);
      const mail = providerOf(r);
      let providerId = r.provider_id as string;
      if (ARCHIVED.includes(r.status) && !ARCHIVED.includes(s.status)) providerId = await mail.unarchive(token, target(r));
      if (Boolean(r.pinned) !== Boolean(s.pinned)) await mail.setPinned(token, { ...target(r), providerId }, s.pinned);
      await sql`update emails set status = ${s.status}, pinned = ${s.pinned}, draft = ${s.draft || ""},
        delegated_to = ${s.delegated_to || ""}, handled_at = ${s.handled_at}, provider_id = ${providerId},
        ai = case when ${s.project}::text is null or ai is null then ai else jsonb_set(ai, '{project}', to_jsonb(${s.project}::text)) end
        where id = ${s.id}`;
    } catch (e) {
      failed.push((e as Error).message);
    }
  }
  await sql`update log set undone = true where id = ${logId}`;
  return Response.json({ emails: await emailsByIds(userId, snaps.map((s) => s.id)), failed });
});
