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
set claim_id = claims.id
from claims
where operations.claim_id is null
  and (operations.result_json::jsonb ->> 'id') = claims.id;

update operations
set claim_id = canonical_id
from claim_aliases
where operations.claim_id = alias_id;
