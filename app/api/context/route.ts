import { aiEnabled, contextRules, spend } from "@/lib/ai";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  if (!aiEnabled()) throw new HttpError(503, "AI isn't set up on this server");
  const b = await readJson<{ text: string; projects?: string[]; senders?: string[]; expires: string }>(req);
  if (!(await spend(userId, 1))) throw new HttpError(429, "You've used today's AI allowance.");
  const rules = await contextRules(String(b.text || ""), (b.projects || []).slice(0, 60), (b.senders || []).slice(0, 80), String(b.expires || ""));
  return Response.json({ rules });
});
