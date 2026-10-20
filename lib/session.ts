import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ready } from "./db";

const COOKIE = "wb_session";
const key = () => {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
};

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function currentUserId(): Promise<string | null> {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  cookies().delete(COOKIE);
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Rejects cross-site writes and returns the signed-in user's id. */
export async function requireUser(req: Request): Promise<string> {
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) throw new HttpError(403, "Request blocked");
  }
  const id = await currentUserId();
  if (!id) throw new HttpError(401, "Sign in first");
  await ready();
  return id;
}

type Handler = (req: Request, ctx: { params: Record<string, string> }) => Promise<Response>;

export function handle(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: "Something went wrong on the server." }, { status: 500 });
    }
  };
}

export async function readJson<T>(req: Request, maxBytes = 200_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Request too large");
  try {
    return JSON.parse(text || "{}") as T;
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
