import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = handle(async (req, { params }) => {
  const userId = await requireUser(req);
  const [r] = await db()`select body, snippet from emails where id = ${params.id} and user_id = ${userId}`;
  if (!r) throw new HttpError(404, "Email not found");
  return Response.json({ body: r.body || r.snippet || "" });
});
