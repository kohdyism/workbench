# Workbench

Workbench connects to a person's Gmail or Outlook inbox and decides what deserves their attention. Claude scores every email for urgency, importance and effort, summarises it and says what it asks of them. Agents handle the routine mail, and the person works through a short **Today** list sized to the time they have. The aim is to tackle email strategically, not to finish everything.

Anyone can sign in with their own Google or Microsoft account. Each person's mail, settings and agents are private to them.

## What it does

- **Sign in with Google or Microsoft.** People can link several mailboxes to one Workbench account.
- **Sync** reads inbox mail from the last 14 days, when the page opens and every 5 minutes while it's open.
- **Scoring:** Claude rates urgency, importance and effort (0 to 10), sets a type and project, and writes a summary. Each person sets their own weights, per-sender rules, an "about me" note and plain-language context for the week (which becomes rules that expire on Friday).
- **Lanes:** Today (capped to the person's time budget), Plan, Delegate, Let go, Ready to send, Handled.
- **Actions in the real mailbox:**
  - **Done** archives the email.
  - **Let go** archives it with a `Workbench/Let go` label (Gmail) or category (Outlook).
  - **Pin** stars it (Gmail) or flags it (Outlook).
  - **Save draft** creates a real reply draft.
  - **Send** replies in the same thread, after a confirm step.
  - **Forward** sends it to a colleague, then archives it.
- **Agents:** "when X, do Y" rules that run on new mail after each sync. Each one either asks first (suggestions go under the bell icon) or acts automatically. **Agents can only send automatically to email with importance 4 or lower.** The server enforces this, not just the interface.
- **Activity and undo:** every action is logged. Archiving, labelling and pinning can be undone. Sends and forwards can't.
- **Demo mode** uses a sample inbox that runs entirely in the browser, with no sign-in.

## How it's built

- **Framework and hosting:** Next.js 14 (App Router) on Vercel. The interface is one dependency-free script (`public/workbench.js`), and the API lives in `app/api/*`.
- **Database:** Postgres (Neon or Vercel Postgres). Tables are created automatically on the first request.
- **Sign-in:** OAuth 2.0 authorisation code flow with PKCE, written directly against Google and Microsoft with no auth library. Access and refresh tokens are encrypted at rest with AES-256-GCM. Sessions are signed, httpOnly cookies, and the server rejects writes coming from other sites.
- **Mail:** the Gmail API and Microsoft Graph, both behind one interface (`lib/providers`). Outlook uses immutable message ids, so moving a message doesn't break it.
- **Claude:** the Messages API, called from the server with your key. Email text is treated as data, and the prompts tell Claude to ignore any instructions inside emails. Each user gets a daily allowance (`AI_DAILY_LIMIT`).

```
app/api/auth/[provider]/start|callback   OAuth sign-in and mailbox linking
app/api/sync                             pull new mail, score it with Claude
app/api/actions                          done, letgo, pin, reply, send, delegate, project, reopen
app/api/undo                             reverse an action in the mailbox
app/api/draft | context | agents/build   Claude features
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
- **Data handling:** message text is stored in your database and sent to Claude for scoring. Each person can disconnect a mailbox or delete everything from the account menu.

## Known limits

- Only the inbox from the last 14 days is synced (`SYNC_DAYS`), up to 60 messages per mailbox per sync (`SYNC_MAX`).
- Changes made in the mail app itself, such as archiving an email in Gmail, aren't reflected in Workbench until the email is handled there.
- Yahoo, iCloud and other IMAP providers aren't supported yet.
- Agents run when Workbench syncs, which happens while someone has it open. They don't run in the background.
