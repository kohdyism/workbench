import { decodeEntities, forwardRaw, htmlToText, newRaw, parseAddr, pool, replyRaw } from "../mime";
import type { Incoming, MailProvider } from "./types";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

async function g(token: string, path: string, init: RequestInit = {}) {
  const r = await fetch(BASE + path, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Gmail ${r.status}: ${t.slice(0, 180)}`);
  }
  return r.status === 204 ? null : r.json();
}

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[]; filename?: string };

const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");

function partsOf(p: Part): { text: string; html: string } {
  let text = "", html = "";
  const walk = (x: Part) => {
    if (x.filename) return;
    if (x.mimeType === "text/plain" && x.body?.data && !text) text = unb64(x.body.data);
    if (x.mimeType === "text/html" && x.body?.data && !html) html = unb64(x.body.data);
    (x.parts || []).forEach(walk);
  };
  walk(p);
  return { text, html };
}

function bodyOf(p: Part): string {
  let html = "";
  const walk = (x: Part): string => {
    if (x.filename) return "";
    if (x.mimeType === "text/plain" && x.body?.data) return unb64(x.body.data);
    if (x.mimeType === "text/html" && x.body?.data && !html) html = htmlToText(unb64(x.body.data));
    for (const c of x.parts || []) {
      const t = walk(c);
      if (t) return t;
    }
    return "";
  };
  return (walk(p) || html).trim();
}

const modify = (token: string, id: string, add: string[], remove: string[]) =>
  g(token, `/messages/${id}/modify`, { method: "POST", body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }) });

async function labelId(token: string, name: string): Promise<string> {
  const res = await g(token, "/labels");
  const found = (res.labels || []).find((l: { name: string }) => l.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const made = await g(token, "/labels", {
    method: "POST",
    body: JSON.stringify({ name, labelListVisibility: "labelShow", messageListVisibility: "show" }),
  });
  return made.id;
}

export const gmail: MailProvider = {
  async list(token, { days, max, known }) {
    const q = encodeURIComponent(`in:inbox newer_than:${days}d`);
    const res = await g(token, `/messages?q=${q}&maxResults=${max}`);
    const ids: string[] = (res.messages || []).map((m: { id: string }) => m.id).filter((id: string) => !known.has(id));
    const out: Incoming[] = [];
    await pool(ids, 6, async (id) => {
      const m = await g(token, `/messages/${id}?format=full`);
      const h: Record<string, string> = {};
      for (const x of m.payload?.headers || []) h[String(x.name).toLowerCase()] = x.value;
      const f = parseAddr(h.from);
      out.push({
        providerId: m.id,
        threadId: m.threadId || null,
        messageId: h["message-id"] || null,
        fromName: f.name,
        fromEmail: f.email,
        to: h.to || "",
        subject: h.subject || "(no subject)",
        snippet: decodeEntities(m.snippet || ""),
        body: bodyOf(m.payload || {}).slice(0, 8000),
        date: new Date(Number(m.internalDate) || Date.now()).toISOString(),
        pinned: (m.labelIds || []).includes("STARRED"),
        unread: (m.labelIds || []).includes("UNREAD"),
      });
    });
    return out;
  },
  async archive(token, t) {
    await modify(token, t.providerId, [], ["INBOX"]);
    return t.providerId;
  },
  async unarchive(token, t) {
    await modify(token, t.providerId, ["INBOX"], []);
    return t.providerId;
  },
  async markRead(token, t) {
    await modify(token, t.providerId, [], ["UNREAD"]);
  },
  async setPinned(token, t, on) {
    await modify(token, t.providerId, on ? ["STARRED"] : [], on ? [] : ["STARRED"]);
  },
  async label(token, t, name) {
    await modify(token, t.providerId, [await labelId(token, name)], []);
  },
  async draftReply(token, t, text) {
    await g(token, "/drafts", {
      method: "POST",
      body: JSON.stringify({ message: { raw: replyRaw(t, text), threadId: t.threadId || undefined } }),
    });
  },
  async sendReply(token, t, text) {
    await g(token, "/messages/send", {
      method: "POST",
      body: JSON.stringify({ raw: replyRaw(t, text), threadId: t.threadId || undefined }),
    });
  },
  async forward(token, t, to, note) {
    await g(token, "/messages/send", { method: "POST", body: JSON.stringify({ raw: forwardRaw(t, to, note) }) });
  },
  async sendNew(token, m) {
    await g(token, "/messages/send", { method: "POST", body: JSON.stringify({ raw: newRaw(m) }) });
  },
  async draftNew(token, m) {
    await g(token, "/drafts", { method: "POST", body: JSON.stringify({ message: { raw: newRaw(m) } }) });
  },
  async original(token, t) {
    const m = await g(token, `/messages/${t.providerId}?format=full`);
    const h: Record<string, string> = {};
    for (const x of m.payload?.headers || []) h[String(x.name).toLowerCase()] = x.value;
    const { text, html } = partsOf(m.payload || {});
    return { html: html || null, text: text || (html ? htmlToText(html) : ""), to: h.to || "", cc: h.cc || "" };
  },
};
