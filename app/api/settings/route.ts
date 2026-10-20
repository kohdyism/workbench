import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const PUT = handle(async (req) => {
  const userId = await requireUser(req);
  const { settings } = await readJson<{ settings: Record<string, unknown> }>(req, 150_000);
  if (!settings || typeof settings !== "object") throw new HttpError(400, "Settings missing");
  const sql = db();
  await sql`update users set settings = ${sql.json(settings as never)} where id = ${userId}`;
  return Response.json({ ok: true });
});
