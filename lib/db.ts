import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __wbSql?: Sql; __wbReady?: Promise<void> };

function connect(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, {
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
    max: 3,
    idle_timeout: 20,
    prepare: false,
  });
}

export function db(): Sql {
  if (!g.__wbSql) g.__wbSql = connect();
  return g.__wbSql;
}

const SCHEMA = `
create table if not exists users (
  id text primary key,
  email text unique not null,
  created_at timestamptz not null default now(),
  settings jsonb not null default '{}'::jsonb,
  ai_day date,
  ai_count int not null default 0
);
create table if not exists accounts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  provider text not null,
  email text not null,
  access_token text not null,
  refresh_token text,
  expires_at bigint not null default 0,
  error text,
  last_sync timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, provider, email)
);
create table if not exists emails (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  account_id text not null references accounts(id) on delete cascade,
  provider_id text not null,
  thread_id text,
  message_id text,
  from_name text,
  from_email text,
  to_addr text,
  subject text,
  snippet text,
  body text,
  date timestamptz,
  status text not null default 'open',
  pinned boolean not null default false,
  ai jsonb,
  scored_by text not null default 'none',
  draft text not null default '',
  delegated_to text not null default '',
  agents_ran boolean not null default false,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (account_id, provider_id)
);
create index if not exists emails_user_status on emails (user_id, status);
create table if not exists log (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  t timestamptz not null default now(),
  actor text not null,
  text text not null,
  undo jsonb not null default '[]'::jsonb,
  undoable boolean not null default true,
  undone boolean not null default false
);
create index if not exists log_user_t on log (user_id, t desc);
create table if not exists queue (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  agent_id text not null,
  email_id text not null references emails(id) on delete cascade,
  created_at timestamptz not null default now()
);
`;

export function ready(): Promise<void> {
  if (!g.__wbReady) {
    g.__wbReady = db().unsafe(SCHEMA).then(() => undefined).catch((e) => {
      g.__wbReady = undefined;
      throw e;
    });
  }
  return g.__wbReady;
}
