import { loadForAction, target } from "@/lib/mailbox";
import { handle, HttpError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Fetches the message live from the mailbox, so it can be shown as the sender wrote it. */
export const GET = handle(async (req, { params }) => {
  const userId = await requireUser(req);
  const { rows, tokenFor, providerOf } = await loadForAction(userId, [params.id]);
  const r = rows[0];
  if (!r) throw new HttpError(404, "Email not found");
  try {
    const o = await providerOf(r).original(await tokenFor(r.account_id), target(r));
    return Response.json({ html: o.html ? o.html.slice(0, 600_000) : null, text: o.text || r.body || "", to: o.to || r.to_addr, cc: o.cc });
  } catch {
    return Response.json({ html: null, text: r.body || r.snippet || "", to: r.to_addr || "", cc: "", offline: true });
  }
});
