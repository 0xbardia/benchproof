# BenchProof Intelligent Contract specification

File: `contracts/benchproof.py`  
Runtime: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`  
Version: `BenchProof-v1.0.1`

## Writes

| Method | Authorization | From | To |
| --- | --- | --- | --- |
| `create_claim(...)` | any sender | — | DRAFT |
| `add_evidence(...)` | claimant only | DRAFT | DRAFT |
| `publish_claim(id)` | claimant, at least one evidence item | DRAFT | OPEN |
| `challenge_claim(...)` | sender other than claimant | OPEN / CHALLENGED | CHALLENGED |
| `request_evaluation(id)` | any sender | OPEN / CHALLENGED | EVALUATING → FINALIZED |

`request_evaluation` calls `gl.eq_principle.prompt_non_comparative` with a structured `untrusted_data` JSON payload and immutable task/criteria. A complete evaluator response must contain exactly the seven required fields with the declared types. Allowed verdicts are `SUPPORTED`, `PARTIALLY_SUPPORTED`, `INSUFFICIENT_EVIDENCE`, `MISLEADING`, and `INVALID`. A `SUPPORTED` response additionally requires at least one key finding and evidence reference. Parse, schema, consensus, or execution failure fails closed to `INVALID`; it never defaults to `SUPPORTED`.

## Reads

`get_claim_count` · `get_claim` · `get_claim_status` · `get_status_name` · `get_claim_verdict` · `get_claimant` · `get_claim_evidence` · `get_evidence_count` · `get_challenge_count` · `get_challenge` · `get_evaluation` · `get_contract_version` · `get_deployer` · `get_limits` · `get_challenge_categories` · `get_verdict_types` · `is_finalized` · `can_challenge` · `can_add_evidence` · `can_evaluate` · `get_claim_core_hash_material`

Indexed accessors validate claim and item IDs. The application bounds synchronized claims to 100 and evidence/challenge reads to the contract maxima.

## Bounds

Title 200 · statement 2000 · methodology 4000 · source URL material 1500 · conditions 1200 · models 120 · versions 80 · URI 512 · hash 128 · note 1000 · evidence 12 · challenges 16 · evaluator output 2000.

## Integrity properties

- Evidence is immutable after publication.
- A claimant cannot self-challenge.
- Finalized claims cannot be challenged, edited, or evaluated again.
- Canonical claim hash material is the exact fourteen-field, newline-ordered representation returned by `get_claim_core_hash_material`.
- Untrusted content is data inside JSON, so delimiter collision cannot create a trusted control section.
- Unknown statuses, malformed evaluator output, and evaluator exceptions are fail-safe.

The previous v1.0.0 deployment remains historical evidence; it was not overwritten.
