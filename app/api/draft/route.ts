import { aiEnabled, draftReply, spend } from "@/lib/ai";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  if (!aiEnabled()) throw new HttpError(503, "Drafting isn't set up on this server");
  const { id } = await readJson<{ id: string }>(req);
  const sql = db();
  const [r] = await sql`select from_name, from_email, subject, body, snippet from emails where id = ${id} and user_id = ${userId}`;
  if (!r) throw new HttpError(404, "Email not found");
  if (!(await spend(userId, 1))) throw new HttpError(429, "You've used today's AI allowance. It resets at midnight UTC.");
  const [u] = await sql`select settings from users where id = ${userId}`;
  const text = await draftReply(
    { fromName: r.from_name || "", fromEmail: r.from_email || "", subject: r.subject || "", body: r.body || r.snippet || "" },
    u?.settings || {}
  );
  return Response.json({ text });
});
