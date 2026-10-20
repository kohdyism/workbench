import { rid } from "@/lib/crypto";
import { db } from "@/lib/db";
import { accessToken, type AccountRow } from "@/lib/oauth";
import { MAIL } from "@/lib/providers";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const list = (s: unknown) =>
  String(s || "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean).slice(0, 50);
const ok = (a: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(a);

/** Sends or drafts a new email from one of the user's mailboxes. */
export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  const b = await readJson<{ accountId: string; to: string; cc?: string; subject: string; body: string; mode: "send" | "draft" }>(req);
  const to = list(b.to), cc = list(b.cc);
  if (!to.length) throw new HttpError(400, "Add at least one recipient.");
  const bad = [...to, ...cc].find((a) => !ok(a));
  if (bad) throw new HttpError(400, `“${bad}” isn't a valid email address.`);
  const sql = db();
  const [a] = (await sql`select * from accounts where id = ${b.accountId} and user_id = ${userId}`) as unknown as AccountRow[];
  if (!a) throw new HttpError(404, "Choose a mailbox to send from.");
  const msg = { to, cc, subject: String(b.subject || "").slice(0, 300), body: String(b.body || "").slice(0, 50000) };
  const token = await accessToken(a);
  if (b.mode === "draft") await MAIL[a.provider].draftNew(token, msg);
  else await MAIL[a.provider].sendNew(token, msg);
  const text = `${b.mode === "draft" ? "Saved a draft" : "Sent"} “${msg.subject || "(no subject)"}” to ${to.join(", ")}`;
  const id = rid(10);
  await sql`insert into log (id, user_id, actor, text, undo, undoable) values (${id}, ${userId}, ${"You"}, ${text}, ${sql.json([])}, false)`;
  return Response.json({ log: { id, t: new Date().toISOString(), actor: "You", text, undoable: false, undone: false } });
});
