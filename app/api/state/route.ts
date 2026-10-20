import { handle, requireUser } from "@/lib/session";
import { loadState } from "@/lib/state";

export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  const userId = await requireUser(req);
  return Response.json(await loadState(userId));
});
