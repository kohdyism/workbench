/** Small helpers for headers, MIME bodies and outgoing RFC 822 messages. */

export function parseAddr(raw: string | undefined): { name: string; email: string } {
  const s = String(raw || "").trim();
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim() || m[2].trim(), email: m[2].trim().toLowerCase() };
  const em = (s.match(/[\w.+'-]+@[\w.-]+/) || [""])[0];
  return { name: s.replace(em, "").replace(/[<>()"]/g, "").trim() || em, email: em.toLowerCase() };
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)));
}

export function htmlToText(h: string): string {
  return decodeEntities(
    h
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li|h\d|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** RFC 2047 encode a header value only when it has non-ASCII characters. */
export function encHeader(v: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=`;
}

const clean = (v: string) => v.replace(/[\r\n]+/g, " ").trim();

export type OutEmail = {
  fromName: string;
  fromEmail: string;
  subject: string;
  messageId?: string | null;
  date?: string | null;
  body?: string | null;
};

function build(headers: Record<string, string>, text: string): string {
  const lines = Object.entries(headers)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${clean(v)}`);
  lines.push("MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "");
  const b64 = Buffer.from(text.replace(/\r?\n/g, "\r\n"), "utf8").toString("base64").replace(/.{76}/g, "$&\r\n");
  return Buffer.from(lines.join("\r\n") + "\r\n" + b64, "utf8").toString("base64url");
}

export function replyRaw(e: OutEmail, text: string): string {
  const subj = /^re:/i.test(e.subject) ? e.subject : `Re: ${e.subject}`;
  const to = e.fromName && e.fromName !== e.fromEmail ? `${encHeader(e.fromName)} <${e.fromEmail}>` : e.fromEmail;
  return build(
    { To: to, Subject: encHeader(subj), "In-Reply-To": e.messageId || "", References: e.messageId || "" },
    text
  );
}

export function forwardRaw(e: OutEmail, to: string, note: string): string {
  const subj = /^fwd?:/i.test(e.subject) ? e.subject : `Fwd: ${e.subject}`;
  const head = [`From: ${e.fromName} <${e.fromEmail}>`];
  if (e.date) head.push(`Date: ${new Date(e.date).toUTCString()}`);
  head.push(`Subject: ${e.subject}`);
  const quoted = [note, "", "---------- Forwarded message ----------", ...head, "", e.body || ""].join("\n");
  return build({ To: to, Subject: encHeader(subj) }, quoted);
}

/** Runs async work over items with a fixed number in flight. */
export async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  const run = async () => {
    while (i < items.length) {
      const x = items[i++];
      await fn(x);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, run));
}
