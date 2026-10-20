import { cookies } from "next/headers";
import { rid } from "@/lib/crypto";
import { appUrl, authorizeUrl, configured, isProvider, pkce } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const p = params.provider;
  if (!isProvider(p)) return Response.redirect(`${appUrl()}/?error=unknown_provider`, 302);
  if (!configured(p)) return Response.redirect(`${appUrl()}/?error=not_configured&provider=${p}`, 302);
  const state = rid(16);
  const { verifier, challenge } = pkce();
  cookies().set("wb_oauth", JSON.stringify({ state, verifier, p }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 600,
  });
  const hint = new URL(req.url).searchParams.get("hint") || undefined;
  return Response.redirect(authorizeUrl(p, state, challenge, hint), 302);
}
