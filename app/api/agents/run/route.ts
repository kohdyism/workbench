import { agentDecide, aiEnabled, spend, type AgentSpec } from "@/lib/ai";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Asks Claude what one agent should do with each email. Decides only; actions go through /api/actions. */
export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  if (!aiEnabled()) throw new HttpError(503, "AI isn't set up on this server");
  const b = await readJson<{ agent: AgentSpec; emailIds: string[] }>(req, 100_000);
  const ids = (b.emailIds || []).filter((x) => typeof x === "string").slice(0, 24);
  if (!ids.length) return Response.json({ decisions: [] });
  const sql = db();
  const rows = await sql`select id, from_name, from_email, subject, body, snippet, date, ai from emails where user_id = ${userId} and id = any(${ids})`;
  if (!(await spend(userId, Math.ceil(rows.length / 2)))) throw new HttpError(429, "You've used today's AI allowance.");
  const [u] = await sql`select settings from users where id = ${userId}`;
  const decisions = await agentDecide(
    b.agent,
    rows.map((r) => ({
      id: r.id, fromName: r.from_name || "", fromEmail: r.from_email || "", subject: r.subject || "",
      body: (r.body || r.snippet || "").slice(0, 1500), date: r.date ? new Date(r.date).toISOString() : "", ai: r.ai,
    })),
    u?.settings?.about || ""
  );
  return Response.json({ decisions });
});
