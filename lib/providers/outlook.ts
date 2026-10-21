import type { Incoming, MailProvider } from "./types";

const BASE = "https://graph.microsoft.com/v1.0/me";

async function m(token: string, path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = init;
  const r = await fetch(BASE + path, {
    ...rest,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      // Immutable ids stay the same when a message moves between folders.
      prefer: 'outlook.body-content-type="text", IdType="ImmutableId"',
      ...(rest.headers || {}),
    },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Outlook ${r.status}: ${t.slice(0, 180)}`);
  }
  return r.status === 202 || r.status === 204 ? null : r.json();
}

type GraphMsg = {
  id: string;
  conversationId?: string;
  internetMessageId?: string;
  subject?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: { emailAddress?: { name?: string; address?: string } }[];
  receivedDateTime?: string;
  bodyPreview?: string;
  body?: { content?: string };
  flag?: { flagStatus?: string };
  isRead?: boolean;
};

const recipients = (xs: string[]) => xs.map((address) => ({ emailAddress: { address } }));
const graphMessage = (msg: { to: string[]; cc: string[]; subject: string; body: string }) => ({
  subject: msg.subject,
  body: { contentType: "Text", content: msg.body },
  toRecipients: recipients(msg.to),
  ccRecipients: recipients(msg.cc),
});

const move = async (token: string, id: string, dest: string) =>
  (await m(token, `/messages/${id}/move`, { method: "POST", json: { destinationId: dest } })).id as string;

export const outlook: MailProvider = {
  async list(token, { days, max, known }) {
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const select = "id,conversationId,internetMessageId,subject,from,toRecipients,receivedDateTime,bodyPreview,body,flag,isRead";
    const path =
      `/mailFolders/inbox/messages?$top=${max}&$select=${select}` +
      `&$filter=${encodeURIComponent(`receivedDateTime ge ${since}`)}&$orderby=${encodeURIComponent("receivedDateTime desc")}`;
    const res = await m(token, path);
    return ((res.value || []) as GraphMsg[])
      .filter((x) => !known.has(x.id))
      .map(
        (x): Incoming => ({
          providerId: x.id,
          threadId: x.conversationId || null,
          messageId: x.internetMessageId || null,
          fromName: x.from?.emailAddress?.name || x.from?.emailAddress?.address || "Unknown",
          fromEmail: (x.from?.emailAddress?.address || "").toLowerCase(),
          to: (x.toRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean).join(", "),
          subject: x.subject || "(no subject)",
          snippet: x.bodyPreview || "",
          body: (x.body?.content || "").replace(/\r/g, "").trim().slice(0, 8000),
          date: x.receivedDateTime || new Date().toISOString(),
          pinned: x.flag?.flagStatus === "flagged",
          unread: x.isRead === false,
        })
      );
  },
  archive: (token, t) => move(token, t.providerId, "archive"),
  unarchive: (token, t) => move(token, t.providerId, "inbox"),
  trash: (token, t) => move(token, t.providerId, "deleteditems"),
  untrash: (token, t) => move(token, t.providerId, "inbox"),
  async unsubInfo(token, t) {
    const x = await m(token, `/messages/${t.providerId}?$select=internetMessageHeaders`);
    const hs: { name?: string; value?: string }[] = x?.internetMessageHeaders || [];
    const get = (n: string) => hs.find((y) => String(y.name).toLowerCase() === n)?.value || "";
    return { header: get("list-unsubscribe"), post: get("list-unsubscribe-post") };
  },
  async markRead(token, t) {
    await m(token, `/messages/${t.providerId}`, { method: "PATCH", json: { isRead: true } });
  },
  async setPinned(token, t, on) {
    await m(token, `/messages/${t.providerId}`, { method: "PATCH", json: { flag: { flagStatus: on ? "flagged" : "notFlagged" } } });
  },
  async label(token, t, name) {
    const cur = await m(token, `/messages/${t.providerId}?$select=categories`);
    const cats: string[] = cur.categories || [];
    if (!cats.includes(name)) await m(token, `/messages/${t.providerId}`, { method: "PATCH", json: { categories: [...cats, name] } });
  },
  async draftReply(token, t, text) {
    await m(token, `/messages/${t.providerId}/createReply`, { method: "POST", json: { comment: text } });
  },
  async sendReply(token, t, text) {
    await m(token, `/messages/${t.providerId}/reply`, { method: "POST", json: { comment: text } });
  },
  async sendNew(token, msg) {
    await m(token, "/sendMail", { method: "POST", json: { message: graphMessage(msg), saveToSentItems: true } });
  },
  async draftNew(token, msg) {
    await m(token, "/messages", { method: "POST", json: graphMessage(msg) });
  },
  async original(token, t) {
    const x = await m(token, `/messages/${t.providerId}?$select=body,toRecipients,ccRecipients`, {
      headers: { prefer: 'IdType="ImmutableId"' },
    });
    const isHtml = String(x.body?.contentType || "").toLowerCase() === "html";
    const list = (r: { emailAddress?: { address?: string } }[] | undefined) =>
      (r || []).map((y) => y.emailAddress?.address).filter(Boolean).join(", ");
    return {
      html: isHtml ? x.body.content : null,
      text: isHtml ? "" : x.body?.content || "",
      to: list(x.toRecipients),
      cc: list(x.ccRecipients),
    };
  },
  async forward(token, t, to, note) {
    await m(token, `/messages/${t.providerId}/forward`, {
      method: "POST",
      json: { comment: note, toRecipients: [{ emailAddress: { address: to } }] },
    });
  },
};
