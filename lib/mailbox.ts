import { db } from "./db";
import { accessToken, type AccountRow } from "./oauth";
import { MAIL, type Target } from "./providers";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type EmailRow = Record<string, any>;

/** Loads a user's emails with their accounts, and hands out one fresh token per account. */
export async function loadForAction(userId: string, ids: string[]) {
  const sql = db();
  const rows: EmailRow[] = ids.length
    ? await sql`select * from emails where user_id = ${userId} and id = any(${ids})`
    : [];
  const accIds = [...new Set(rows.map((r) => r.account_id))];
  const accounts: AccountRow[] = accIds.length
    ? ((await sql`select * from accounts where user_id = ${userId} and id = any(${accIds})`) as unknown as AccountRow[])
    : [];
  const tokens = new Map<string, Promise<string>>();
  const tokenFor = (accountId: string) => {
    if (!tokens.has(accountId)) {
      const a = accounts.find((x) => x.id === accountId);
      if (!a) return Promise.reject(new Error("Account not found"));
      tokens.set(accountId, accessToken(a));
    }
    return tokens.get(accountId)!;
  };
  const providerOf = (r: EmailRow) => MAIL[accounts.find((a) => a.id === r.account_id)!.provider];
  return { rows, tokenFor, providerOf };
}

export const target = (r: EmailRow): Target => ({
  providerId: r.provider_id,
  threadId: r.thread_id,
  messageId: r.message_id,
  fromName: r.from_name || r.from_email,
  fromEmail: r.from_email,
  subject: r.subject || "",
  date: r.date ? new Date(r.date).toISOString() : null,
  body: r.body || r.snippet || "",
});

export const firstName = (n: string) =>
  String(n || "").replace(/<.*>/, "").replace(/["']/g, "").trim().split(/[\s,]+/)[0] || "there";

export const ARCHIVED = ["done", "letgo", "delegated", "sent"];
