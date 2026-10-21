import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type UnsubPlan = { oneClick: string | null; mailto: { to: string; subject: string; body: string } | null; link: string | null };

const isEmail = (s: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);

/** Reads List-Unsubscribe ("<mailto:…>, <https://…>") and List-Unsubscribe-Post (RFC 2369 and RFC 8058). */
export function planUnsub(header: string, post: string): UnsubPlan {
  const items = [...String(header || "").matchAll(/<([^>]+)>/g)].map((m) => m[1].trim());
  const https = items.find((u) => /^https:\/\//i.test(u)) || null;
  const mt = items.find((u) => /^mailto:/i.test(u));
  let mailto: UnsubPlan["mailto"] = null;
  if (mt) {
    try {
      const u = new URL(mt);
      const to = decodeURIComponent(u.pathname);
      if (isEmail(to)) mailto = { to, subject: u.searchParams.get("subject") || "unsubscribe", body: u.searchParams.get("body") || "Please unsubscribe me from this mailing list." };
    } catch { /* ignore a malformed address */ }
  }
  const oneClick = https && /List-Unsubscribe=One-Click/i.test(post || "") ? https : null;
  return { oneClick, mailto, link: https };
}

function privateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const x = ip.toLowerCase();
    if (x.startsWith("::ffff:")) return privateIp(x.slice(7));
    return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** Sends the RFC 8058 one-click request. Only to public https hosts, no redirects, short timeout. */
export async function oneClick(url: string): Promise<boolean> {
  const u = new URL(url);
  if (u.protocol !== "https:" || (u.port && u.port !== "443")) return false;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) || /^(localhost|.*\.local|.*\.internal)$/i.test(host)) return false;
  const addrs = await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) return false;
  const r = await fetch(u, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "List-Unsubscribe=One-Click",
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
  });
  return r.status < 400;
}
