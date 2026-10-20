import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Disconnects one mailbox and deletes everything Workbench stored from it. */
export const DELETE = handle(async (req, { params }) => {
  const userId = await requireUser(req);
  const res = await db()`delete from accounts where id = ${params.id} and user_id = ${userId}`;
  if (!res.count) throw new HttpError(404, "Account not found");
  return Response.json({ ok: true });
});
