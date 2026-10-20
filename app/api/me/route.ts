import { db } from "@/lib/db";
import { clearSession, handle, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Deletes the user, every connected mailbox and all stored mail, settings and history. */
export const DELETE = handle(async (req) => {
  const userId = await requireUser(req);
  await db()`delete from users where id = ${userId}`;
  clearSession();
  return Response.json({ ok: true });
});
