import crypto from "crypto";
import { db } from "./db";
import { decrypt, encrypt } from "./crypto";

export type Provider = "google" | "microsoft";

type Conf = {
  auth: string;
  token: string;
  scope: string;
  id: () => string | undefined;
  secret: () => string | undefined;
  extra: Record<string, string>;
};

export const CONFIG: Record<Provider, Conf> = {
  google: {
    auth: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope:
      "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send",
    id: () => process.env.GOOGLE_CLIENT_ID,
    secret: () => process.env.GOOGLE_CLIENT_SECRET,
    extra: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
  },
  microsoft: {
    auth: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile offline_access User.Read Mail.ReadWrite Mail.Send",
    id: () => process.env.MICROSOFT_CLIENT_ID,
    secret: () => process.env.MICROSOFT_CLIENT_SECRET,
    extra: { prompt: "select_account" },
  },
};

export const isProvider = (p: string): p is Provider => p === "google" || p === "microsoft";
export const configured = (p: Provider) => Boolean(CONFIG[p].id() && CONFIG[p].secret());
export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
export const redirectUri = (p: Provider) => `${appUrl()}/api/auth/${p}/callback`;

export function pkce() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function authorizeUrl(p: Provider, state: string, challenge: string, loginHint?: string) {
  const c = CONFIG[p];
  const u = new URL(c.auth);
  const q: Record<string, string> = {
    client_id: c.id() || "",
    redirect_uri: redirectUri(p),
    response_type: "code",
    scope: c.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    ...c.extra,
  };
  if (loginHint) q.login_hint = loginHint;
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  return u.toString();
}

type Tokens = { access_token: string; refresh_token?: string; expires_in: number; scope?: string };

async function tokenRequest(p: Provider, params: Record<string, string>): Promise<Tokens> {
  const c = CONFIG[p];
  const body = new URLSearchParams({ client_id: c.id() || "", client_secret: c.secret() || "", ...params });
  if (p === "microsoft") body.set("scope", c.scope);
  const r = await fetch(c.token, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || `Token request failed (${r.status})`);
  return j as Tokens;
}

export const exchangeCode = (p: Provider, code: string, verifier: string) =>
  tokenRequest(p, { grant_type: "authorization_code", code, redirect_uri: redirectUri(p), code_verifier: verifier });

export async function profile(p: Provider, access: string): Promise<{ email: string; name: string }> {
  if (p === "google") {
    const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${access}` },
    });
    const j = await r.json();
    return { email: String(j.email || "").toLowerCase(), name: j.name || "" };
  }
  const r = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName", {
    headers: { authorization: `Bearer ${access}` },
  });
  const j = await r.json();
  return { email: String(j.mail || j.userPrincipalName || "").toLowerCase(), name: j.displayName || "" };
}

export type AccountRow = {
  id: string;
  user_id: string;
  provider: Provider;
  email: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | number;
  error: string | null;
};

export class ReconnectError extends Error {}

/** Returns a valid access token, refreshing and re-encrypting it when it is about to expire. */
export async function accessToken(a: AccountRow): Promise<string> {
  if (Number(a.expires_at) > Date.now() + 60_000) return decrypt(a.access_token);
  if (!a.refresh_token) throw new ReconnectError("This account needs to be reconnected.");
  const sql = db();
  try {
    const t = await tokenRequest(a.provider, { grant_type: "refresh_token", refresh_token: decrypt(a.refresh_token) });
    const exp = Date.now() + t.expires_in * 1000;
    const newRefresh = t.refresh_token ? encrypt(t.refresh_token) : a.refresh_token;
    await sql`update accounts set access_token = ${encrypt(t.access_token)}, refresh_token = ${newRefresh},
      expires_at = ${exp}, error = null where id = ${a.id}`;
    a.access_token = encrypt(t.access_token);
    a.refresh_token = newRefresh;
    a.expires_at = exp;
    return t.access_token;
  } catch (e) {
    await sql`update accounts set error = ${"Reconnect needed"} where id = ${a.id}`;
    throw new ReconnectError((e as Error).message);
  }
}
