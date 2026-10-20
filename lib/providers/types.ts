import type { OutEmail } from "../mime";

export type Incoming = {
  providerId: string;
  threadId: string | null;
  messageId: string | null;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  pinned: boolean;
};

/** The provider-side message a mailbox action works on. */
export type Target = OutEmail & { providerId: string; threadId: string | null };

export interface MailProvider {
  /** Inbox messages from the last `days` days, skipping ids already stored. */
  list(token: string, opts: { days: number; max: number; known: Set<string> }): Promise<Incoming[]>;
  /** Removes from the inbox. Returns the message id afterwards (Outlook ids change on move). */
  archive(token: string, t: Target): Promise<string>;
  unarchive(token: string, t: Target): Promise<string>;
  setPinned(token: string, t: Target, on: boolean): Promise<void>;
  label(token: string, t: Target, name: string): Promise<void>;
  draftReply(token: string, t: Target, text: string): Promise<void>;
  sendReply(token: string, t: Target, text: string): Promise<void>;
  forward(token: string, t: Target, to: string, note: string): Promise<void>;
}
