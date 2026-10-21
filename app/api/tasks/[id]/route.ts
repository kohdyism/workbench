import { db } from "@/lib/db";
import { handle, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const DELETE = handle(async (req, { params }) => {
  const userId = await requireUser(req);
  await db()`delete from tasks where id = ${params.id} and user_id = ${userId}`;
  return Response.json({ ok: true });
});
