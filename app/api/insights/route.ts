import { aiEnabled, rundown, spend, suggestBuckets, summariseBuckets, type Brief } from "@/lib/ai";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */
const toBrief = (r: any): Brief => ({
  id: r.id, from: `${r.from_name || ""} <${r.from_email || ""}>`, subject: String(r.subject || "").slice(0, 200),
  type: r.ai?.type || "", project: r.ai?.project || "", summary: String(r.ai?.summary || r.snippet || "").slice(0, 200),
  ask: String(r.ai?.ask || "").slice(0, 120), date: r.date ? new Date(r.date).toISOString() : "",
});
const ids = (v: unknown, n: number) => (Array.isArray(v) ? v : []).filter((x) => typeof x === "string").slice(0, n) as string[];

/** Claude features that look across many emails: bucket suggestions, bucket summaries and the daily rundown. */
export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  if (!aiEnabled()) throw new HttpError(503, "AI isn't set up on this server");
  const b = await readJson<Record<string, any>>(req, 150_000);
  const sql = db();
  const [u] = await sql`select settings from users where id = ${userId}`;
  const about = String(u?.settings?.about || "");
  const load = async (list: string[]) => {
    if (!list.length) return new Map<string, Brief>();
    const rows = await sql`select id, from_name, from_email, subject, snippet, date, ai from emails where user_id = ${userId} and id = any(${list})`;
    return new Map(rows.map((r) => [r.id as string, toBrief(r)]));
  };

  if (b.kind === "buckets") {
    if (!(await spend(userId, 2))) throw new HttpError(429, "You've used today's AI allowance.");
    const rows = await sql`select id, from_name, from_email, subject, snippet, date, ai from emails
      where user_id = ${userId} and status in ('open','ready') order by date desc limit 150`;
    const buckets = await suggestBuckets(rows.map(toBrief), ids(b.existing, 30), about);
    return Response.json({ buckets });
  }
  if (b.kind === "summaries") {
    const list = (Array.isArray(b.buckets) ? b.buckets : []).slice(0, 12);
    if (!list.length) return Response.json({ summaries: {} });
    if (!(await spend(userId, Math.min(4, list.length)))) throw new HttpError(429, "You've used today's AI allowance.");
    const all = await load(list.flatMap((x: any) => ids(x.emailIds, 25)));
    const summaries = await summariseBuckets(
      list.map((x: any) => ({ id: String(x.id).slice(0, 40), name: String(x.name || "").slice(0, 60), description: String(x.description || "").slice(0, 200),
        emails: ids(x.emailIds, 25).map((id) => all.get(id)).filter(Boolean) as Brief[] })).filter((x: any) => x.emails.length),
      about
    );
    return Response.json({ summaries });
  }
  if (b.kind === "rundown") {
    if (!(await spend(userId, 2))) throw new HttpError(429, "You've used today's AI allowance.");
    const rec = ids(b.receivedIds, 60), urg = ids(b.urgentIds, 10), wk = ids(b.weekIds, 60);
    const all = await load([...rec, ...urg, ...wk]);
    const pick = (l: string[]) => l.map((id) => all.get(id)).filter(Boolean) as Brief[];
    const data = await rundown({
      date: new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      about, context: String(u?.settings?.context || ""),
      stats: Object.fromEntries(Object.entries(b.stats || {}).slice(0, 20).map(([k, v]) => [k.slice(0, 40), typeof v === "number" ? v : String(v).slice(0, 80)])),
      received: pick(rec), urgent: pick(urg), week: pick(wk),
      todo: (Array.isArray(b.todo) ? b.todo : []).slice(0, 20).map((t: any) => ({ text: String(t.text || "").slice(0, 160), emailId: t.emailId ? String(t.emailId) : null })),
      buckets: (Array.isArray(b.buckets) ? b.buckets : []).slice(0, 12).map((x: any) => ({ name: String(x.name || "").slice(0, 60), open: Number(x.open) || 0, urgent: Number(x.urgent) || 0 })),
    });
    return Response.json({ rundown: data });
  }
  throw new HttpError(400, "Unknown request");
});
