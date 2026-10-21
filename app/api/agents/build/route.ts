import { aiEnabled, buildAgent, spend } from "@/lib/ai";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const POST = handle(async (req) => {
  const userId = await requireUser(req);
  if (!aiEnabled()) throw new HttpError(503, "AI isn't set up on this server");
  const b = await readJson<{ desc: string; projects?: string[] }>(req);
  if (!(await spend(userId, 1))) throw new HttpError(429, "You've used today's AI allowance. It resets at midnight UTC.");
  return Response.json({ agent: await buildAgent(String(b.desc || ""), (b.projects || []).slice(0, 60)) });
});
