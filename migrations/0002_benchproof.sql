create table if not exists claims (
  id text primary key,
  onchain_id integer,
  claimant text not null,
  title text not null,
  statement text not null,
  model_a text not null,
  model_a_version text not null,
  model_b text not null,
  model_b_version text not null,
  benchmark text not null,
  benchmark_version text not null,
  evaluation_date text not null,
  metric text not null,
  reported_result text not null,
  methodology text not null default '',
  source_urls text not null default '[]',
  conditions_json text not null default '{}',
  status text not null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  tx_hash text not null default '',
  tx_state text not null default '',
  registry text not null default 'index',
  scenario text not null default '',
  core_hash text not null default ''
);

create table if not exists evidence (
  id text primary key,
  claim_id text not null references claims(id) on delete cascade,
  kind text not null,
  uri text not null default '',
  content_hash text not null default '',
  note text not null default '',
  added_at timestamptz not null default now(),
  onchain_index integer
);

create index if not exists evidence_claim_id_idx on evidence (claim_id);

create table if not exists challenges (
  id text primary key,
  claim_id text not null references claims(id) on delete cascade,
  challenger text not null,
  category text not null,
  reason text not null,
  explanation text not null,
  evidence_uri text not null default '',
  evidence_hash text not null default '',
  created_at timestamptz not null default now(),
  onchain_index integer
);

create index if not exists challenges_claim_id_idx on challenges (claim_id);

create table if not exists evaluations (
  claim_id text primary key references claims(id) on delete cascade,
  present boolean not null default true,
  verdict text not null,
  confidence text not null default 'medium',
  summary text not null default '',
  key_findings text not null default '[]',
  material_issues text not null default '[]',
  limitations text not null default '[]',
  evidence_references text not null default '[]',
  evaluated_at timestamptz not null default now(),
  evaluator_version text not null default '',
  source text not null default 'preview'
);

create table if not exists transactions (
  id text primary key,
  claim_id text,
  method text not null,
  hash text not null default '',
  status text not null,
  detail text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_meta (
  key text primary key,
  value text not null
);
