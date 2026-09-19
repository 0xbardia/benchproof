create table if not exists claim_aliases (
  alias_id text primary key references claims(id) on delete cascade,
  canonical_id text not null references claims(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (alias_id <> canonical_id)
);

create index if not exists claim_aliases_canonical_id_idx on claim_aliases (canonical_id);

alter table operations add column if not exists claim_id text;
alter table operations add column if not exists operation_type text not null default '';
alter table operations add column if not exists state text not null default 'QUEUED';
alter table operations add column if not exists tx_hash text not null default '';
alter table operations add column if not exists submitted_at timestamptz;
alter table operations add column if not exists finalized_at timestamptz;

create index if not exists operations_claim_kind_idx on operations (claim_id, kind, updated_at);

update operations
set operation_type = case kind
  when 'create_claim' then 'CREATE_CLAIM'
  when 'record_claim' then 'CREATE_CLAIM'
  when 'challenge' then 'CHALLENGE'
  when 'genlayer_evaluation' then 'REQUEST_EVALUATION'
  when 'preview_evaluation' then 'PREVIEW_EVALUATION'
  else kind
end
where operation_type = '' or operation_type = kind;

update operations
set state = case status
  when 'completed' then 'FINALIZED'
  when 'failed' then 'FAILED'
  else 'QUEUED'
end
where state = 'QUEUED';

update operations
set tx_hash = coalesce(nullif(tx_hash, ''), nullif((result_json::jsonb ->> 'txHash'), ''), '')
where (tx_hash is null or tx_hash = '') and result_json <> '';

update operations set tx_hash = '' where tx_hash is null;
