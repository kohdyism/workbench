# Workbench

Workbench connects to a person's Gmail or Outlook inbox and decides what deserves their attention. Claude scores every email for urgency, importance and effort, summarises it and says what it asks of them. Agents handle the routine mail, and the person works through a short **Today** list sized to the time they have. The aim is to tackle email strategically, not to finish everything.

Anyone can sign in with their own Google or Microsoft account. Each person's mail, settings and agents are private to them.

## What it does

- **Accounts:** people sign up with an email and password, or continue with Google or Microsoft, then connect as many Gmail and Outlook mailboxes as they like. A mailbox can belong to only one Workbench account.
- **Navigation:** the left bar has sections with subtabs, so you can work in one focused list at a time.
  - **Dashboard:** Overview and Buckets.
  - **Inbox:** Do today, Needs your OK, Replies owed, Do later, Hand off, Low priority, All mail, Drafts and Done, then one list per bucket.
  - **Tasks:** To do, Suggested and Done.
  - Agents, Priorities, Activity and Accounts.
  - Sections can be collapsed; Workbench remembers your choice.
- **Dashboard (Overview)**, ordered from "what needs me now" down to background detail:
  - **A sticky progress strip** under the greeting stays in view as you scroll: today's progress, Urgent, Needs your OK, Tasks and Replies owed. Each number opens that list in the Inbox at its first email. The time budget, this week's context and the ranking preset sit at the right end.
  - **Your daily rundown:** a newsletter-style briefing written by Claude once a day. Minimised, it's a slim strip with the headline and a one-line summary; **Read all** opens the full briefing, with each item linking to its email.
  - **Do today** with a **Start** button, links to Do later, Hand off and Low priority underneath, and **Tasks** below. **Needs your OK** sits alongside with agent actions, suggested tasks and drafts ready to send; approve them in place, or choose **One by one** to review each with its email.
  - **Bucket cards:** each shows its open count, a summary, and status links for Urgent, For your OK and Unread. Clicking a card or a status opens the bucket in a panel on the right, already filtered to that status. The panel has the summary and numbers, the bucket's email by status, **Work through** (opens it in the Inbox), Edit, Keep or Remove, and bulk actions for everything open in it: **Mark read**, **Archive all**, **Unsubscribe…** and **Delete all**.
  - **Behind the scenes**, at the bottom: the last 7 days, agent activity and mailbox status.
- **Working through email:** clicking an email anywhere opens it in the Inbox inside the list you came from, so you keep your place.
  - The toolbar shows where you are ("2 of 7") with previous and next.
  - When you finish an email (done, archive, send, forward or approve), Workbench moves straight to the next one.
  - Keyboard: J and K move between emails, E marks done, R replies.
  - When a list is empty, it suggests the next list with work waiting.
  - The email view keeps the ranking out of the way: one line with the lane, score, project and what's asked. **Why here?** opens a small popover with urgency, importance and effort, the reasons, the bucket, and buttons to rank the sender higher or lower. Agent suggestions and suggested tasks for that email appear above the message, ready to approve.
- **Buckets page:** tabs to group your mail by **Topic** (your buckets), **Urgency**, **Importance**, **Effort**, **Type** or **Mailbox**. Claude suggests the topic buckets after the first sort, and you can keep, edit, remove or make your own. Each card shows its open count, urgent, for approval, unread, tasks and priority, plus a summary. Clicking a card opens a panel to the right with its email by status, and **Work through** opens that group as a list in the Inbox.
- Hovering a number, bucket, score, sender or mailbox shows more detail.
- **Tasks:** create a task from any email, or approve one that Claude suggests while sorting. **Claude's suggestions never become tasks until you approve them**; you can edit or dismiss them instead. Click a task to open it in place: rename it, set progress (To do, In progress, Done), set a due date, write a description, and link or unlink emails. One task can be linked to several emails, and you can add an email to an existing task from the email itself. Changes save automatically. Tasks show on the dashboard, on each linked email, and on their own Tasks page with due, overdue and done.
- **Inbox:** a normal mail client across every connected mailbox.
  - Folders (Inbox, Drafts, Done), a mailbox filter and search.
  - A reading pane that shows the original formatted email in a sandboxed frame, with remote images blocked until you choose to show them.
  - Reply (with a Claude draft), forward, save a draft, send after a confirm step, done, archive, pin, and compose a new email from any mailbox.
- **Agents:** a list of agents on the left. Clicking one shows its page on the right, with five tabs:
  - **Activity:** what it has done, with reasons; suggestions waiting for approval; emails currently in scope.
  - **Instructions:** plain-language instructions and the actions Claude may take.
  - **Context:** facts only this agent sees.
  - **Settings:** scope, importance limit, default action, approval mode, colour.
  - **Test run:** previews what it would do, without changing anything.

  An agent with instructions is Claude-powered: Claude reads each email in its scope and decides an action, a draft and a reason. Without instructions, it applies one fixed action.
- **Scoring:** Claude rates urgency, importance and effort (0 to 10), sets a type and project, and summarises each email. People set their own weights, per-sender rules, an "about me" note and plain-language context for the week, which becomes rules that expire on Friday.
- **Delete:** delete one email from its row or the email view (or press #), or every open email in a bucket. Deleted email goes to Gmail's Bin or Outlook's Deleted Items, which empty after about 30 days, and can be undone from the toast or Activity. Only you can delete; agents can't.
- **Unsubscribe:** from a bucket, pick which senders to leave. Newsletters, notifications and sales email are ticked for you, and people are not. Workbench uses the unsubscribe option each sender includes (List-Unsubscribe): a one-click request where offered, otherwise an unsubscribe email from your mailbox, otherwise a link to their page for you to finish. It can also archive their emails. One-click requests only go to public https addresses, without following redirects.
- **Move to bucket:** any email can be moved to another bucket from its row or the email view.
- **Mailbox actions:** Opening an email marks it read in your mailbox. Done archives the email. Archive puts it away with a `Workbench/Low priority` label (Gmail) or category (Outlook). Pin stars or flags it. Workbench can also save real drafts, send replies in the thread, forward, and send new mail.
- **Safety:** agents can only send automatically to email with importance 4 or lower, and the server enforces this. Sending always has a confirm step for people. Archiving, labelling and pinning can be undone from Activity; sends and forwards can't.
- **Demo mode:** a sample inbox that runs entirely in the browser, with no sign-in.

## How it's built

- **Framework and hosting:** Next.js 14 (App Router) on Vercel. The interface is one dependency-free script (`public/workbench.js`), and the API lives in `app/api/*`.
- **Database:** Postgres (Neon or Vercel Postgres). Tables are created automatically on the first request.
- **Sign-in:** email and password (scrypt-hashed, with a lockout after repeated failures), or the OAuth 2.0 authorisation code flow with PKCE, written directly against Google and Microsoft with no auth library. Access and refresh tokens are encrypted at rest with AES-256-GCM. Sessions are signed, httpOnly cookies, and the server rejects writes coming from other sites.
- **Mail:** the Gmail API and Microsoft Graph, both behind one interface (`lib/providers`). Outlook uses immutable message ids, so moving a message doesn't break it.
- **Claude:** the Messages API, called from the server with your key. Email text is treated as data, and the prompts tell Claude to ignore any instructions inside emails. Each user gets a daily allowance (`AI_DAILY_LIMIT`).

```
app/api/auth/signup | login | logout      email and password accounts
app/api/auth/[provider]/start|callback   OAuth sign-in and mailbox linking
app/api/sync                             pull new mail, score it with Claude
app/api/actions                          read, done, letgo, delete, pin, reply, send, delegate, project, reopen
app/api/unsubscribe                      unsubscribe from senders (List-Unsubscribe)
app/api/undo                             reverse an action in the mailbox
app/api/compose                          send or draft a new email
app/api/tasks (POST) | tasks/[id] (DELETE)  create, update and delete tasks
app/api/insights                         Claude: bucket suggestions, bucket summaries, daily rundown
app/api/emails/[id]/original             fetch the original formatted message
app/api/agents/run                       Claude decides what an agent does with each email
app/api/draft | context | agents/build   other Claude features
app/api/state | settings | queue         load and save per-user state
app/api/accounts/[id] (DELETE)           disconnect a mailbox and delete its data
app/api/me (DELETE)                      delete the user and everything stored
```

## Set up

You need a Vercel account, a GitHub repository with this code, a Google Cloud project, a Microsoft Entra app registration and an Anthropic API key. Plan on about 30 to 45 minutes.

### 1. Database

In Vercel, open **Storage** and add a Postgres database (Neon). It sets `DATABASE_URL` for you. Any Postgres 14+ works; for a local database without TLS, set `DATABASE_SSL=disable`.

### 2. Google (Gmail)

1. In Google Cloud Console, create a project and enable the **Gmail API**.
2. Configure the **OAuth consent screen**: choose External, then add the scopes `openid`, `email`, `profile`, `https://www.googleapis.com/auth/gmail.modify` and `https://www.googleapis.com/auth/gmail.send`. Add your privacy page URL (`https://YOUR-DOMAIN/privacy`).
3. While the app is in **Testing**, add each person who will use it as a **test user**. You can add up to 100.
4. Create an **OAuth client ID** of type *Web application*, with the authorised redirect URI `https://YOUR-DOMAIN/api/auth/google/callback` (add `http://localhost:3000/api/auth/google/callback` for local development).
5. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### 3. Microsoft (Outlook)

1. In the Entra admin centre (or the Azure portal), go to **App registrations** and create a **New registration**.
2. For **supported account types**, choose *Accounts in any organisational directory and personal Microsoft accounts*.
3. Set the **redirect URI** to platform *Web*, `https://YOUR-DOMAIN/api/auth/microsoft/callback`.
4. Under **API permissions**, add these delegated Microsoft Graph permissions: `openid`, `email`, `profile`, `offline_access`, `User.Read`, `Mail.ReadWrite` and `Mail.Send`.
5. Under **Certificates & secrets**, create a client secret.
6. Copy the Application (client) ID and the secret value into `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`.

### 4. Environment variables

Copy `.env.example` and fill it in. Generate the two secrets with `openssl rand -base64 32`.

| Variable | What it is |
|---|---|
| `APP_URL` | Your deployment URL with no trailing slash. It must match the redirect URIs above. |
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | 32+ random characters for signing sessions |
| `ENCRYPTION_KEY` | 32 random bytes, base64. **Keep it stable**: changing it makes stored tokens unreadable. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From step 2 |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | From step 3 |
| `ANTHROPIC_API_KEY` | Your Claude API key. Without it, Workbench falls back to basic keyword sorting. |
| `AI_DAILY_LIMIT` | Optional. Emails scored plus drafts per user per day (default 400). |
| `NEXT_PUBLIC_OPERATOR_NAME` / `NEXT_PUBLIC_CONTACT_EMAIL` | Shown on the privacy page |

### 5. Deploy

Import the repository into Vercel, add the variables, and deploy. Then set `APP_URL` to the final domain, update both redirect URIs to match, and redeploy.

The sync, action and draft routes declare `maxDuration = 60` seconds, so make sure your Vercel plan allows that.

### Local development

```bash
npm install
cp .env.example .env.local   # fill in, with APP_URL=http://localhost:3000
npm run dev
```

## Before opening it to the public

- **Google:** `gmail.modify` and `gmail.send` are *restricted* scopes. To let people beyond your test users sign in, Google requires app verification and an independent security assessment (CASA), renewed every year. While the app is in Testing mode, people see an "unverified app" warning and their sign-in expires after about 7 days, so they'll need to reconnect.
- **Microsoft:** complete *publisher verification* so people don't see an "unverified" warning. Some organisations only allow apps an admin has approved, so their users will need admin consent.
- Publish real terms and a privacy policy. `/privacy` is a starting template that covers Google's Limited Use requirements; have it reviewed for where you operate.
- **Data handling:** message text is stored in your database and sent to Claude for scoring. Each person can disconnect a mailbox or delete everything from the Accounts page.

## Known limits

- Only the inbox from the last 14 days is synced (`SYNC_DAYS`), up to 60 messages per mailbox per sync (`SYNC_MAX`).
- Changes made in the mail app itself, such as archiving an email in Gmail, aren't reflected in Workbench until the email is handled there.
- Yahoo, iCloud and other IMAP providers aren't supported yet.
- There's no password reset by email yet, because the app has no email-sending service of its own. Add one (for example Resend or Postmark) before launch.
- Agents run when Workbench syncs, which happens while someone has it open. They don't run in the background.
