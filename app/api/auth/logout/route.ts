import { clearSession } from "@/lib/session";

export async function POST() {
  clearSession();
  return Response.json({ ok: true });
}
