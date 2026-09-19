-- A receipt-polling outage must not turn a submitted evaluation into a
-- retryable write. The transaction hash is the durable hand-off point.
update operations
set status = 'pending', state = 'CONSENSUS_PENDING', error_code = '', updated_at = now()
where kind = 'genlayer_evaluation' and status = 'failed' and tx_hash <> '';

update claims
set status = 'EVALUATING', tx_state = 'consensus_pending'
where id in (
  select claim_id from operations
  where kind = 'genlayer_evaluation' and status = 'pending' and claim_id is not null and tx_hash <> ''
)
and status <> 'FINALIZED';
