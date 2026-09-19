-- Worked examples use the local rubric and must not occupy canonical FINALIZED state.
update claims
set status = 'OPEN', tx_state = 'submitted'
where registry = 'seed';
