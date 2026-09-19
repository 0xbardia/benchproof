create table if not exists operations (
  idempotency_key text primary key,
  kind text not null,
  fingerprint text not null,
  status text not null check (status in ('pending', 'completed', 'failed')),
  result_json text not null default '{}',
  error_code text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operations_updated_at_idx on operations (updated_at);

create table if not exists sync_runs (
  id text primary key,
  status text not null check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_code text not null default ''
);
