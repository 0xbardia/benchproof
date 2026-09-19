# CONTRACT-PROOF

## Identity

| Field | Value |
| --- | --- |
| Contract name | BenchProof |
| Source | `contracts/benchproof.py` |
| Version | `BenchProof-v1.0.1` |
| Network | Studionet |
| Chain ID | 61999 |
| RPC | https://studio.genlayer.com/api |
| Studio | https://studio.genlayer.com/contracts |
| Address | `0x2368a42582710f61AF4f29A432990328db32a2ec` |
| Deploy tx | `0xd2b875600a60ef8bff48488441a4e9183940adde5cb6de46e5b5df02637669fa` |
| Finality | status 7 FINALIZED · result code 6 MAJORITY_AGREE |
| Source fingerprint | `ec09686724ad2b2a1d1f8784eb9d6787a949be1bf55e1aaae2cec3bf02c5dfa9` |

Explorer:

- https://explorer-studio.genlayer.com/address/0x2368a42582710f61AF4f29A432990328db32a2ec
- https://explorer-studio.genlayer.com/tx/0xd2b875600a60ef8bff48488441a4e9183940adde5cb6de46e5b5df02637669fa

## Real evaluation

| Field | Value |
| --- | --- |
| Claim | 1 · Matched SWE-bench Verified run |
| Evaluation tx | `0x3ce022d3e3874f85854c74e307a6acf231892b9563c459916acd4f699ca7be6a` |
| Receipt | status 7 FINALIZED |
| Consensus | MAJORITY_AGREE |
| Execution | FINISHED_WITH_RETURN |
| GenVM stderr | empty |
| Verdict | `INSUFFICIENT_EVIDENCE` |
| Confidence | medium |
| Why | Conditions are disclosed, but raw per-task results/trajectories are not attached. |

Explorer: https://explorer-studio.genlayer.com/tx/0x3ce022d3e3874f85854c74e307a6acf231892b9563c459916acd4f699ca7be6a

## One-minute contract story

1. A structured benchmark claim is created as `DRAFT` (`create_claim`).
2. Evidence metadata, references, and hashes are attached (`add_evidence`).
3. The claimant publishes the claim (`publish_claim`) → `OPEN`.
4. A different sender can challenge it (`challenge_claim`) → `CHALLENGED`.
5. `request_evaluation` gives GenLayer an explicit JSON `untrusted_data` payload and immutable evaluation criteria.
6. Validators return a complete structured object. The contract strictly validates fields, types, bounds, and verdict vocabulary.
7. The result is stored as canonical `FINALIZED` state. Malformed or incomplete output fails safe to `INVALID`, never `SUPPORTED`.

Verdict types: `SUPPORTED` · `PARTIALLY_SUPPORTED` · `INSUFFICIENT_EVIDENCE` · `MISLEADING` · `INVALID`.

## Public reads

`docs/read-method-matrix.json` records **38/38 PASS**: all 21 public read methods against claim 1, plus invalid claim/evidence/challenge ID checks. Highlights:

| Method | Result |
| --- | --- |
| `get_contract_version` | `BenchProof-v1.0.1` |
| `get_claim_count` | `1` |
| `get_claim(1)` | status `4` / `FINALIZED` |
| `get_evidence_count(1)` | `2` |
| `get_challenge_count(1)` | `1` |
| `get_claim_verdict(1)` | `INSUFFICIENT_EVIDENCE` |
| `get_evaluation(1)` | present, structured, `INSUFFICIENT_EVIDENCE` |
| `is_finalized(1)` | `true` |
| `can_challenge(1)` | `false` |
| `can_add_evidence(1)` | `false` |
| `can_evaluate(1)` | `false` |
| invalid IDs | safe failures |

## Lifecycle write evidence

The verified claim’s write matrix is `docs/write-method-matrix.json`:

| Operation | Transaction |
| --- | --- |
| `create_claim` | `0x57354d60bfa1354c6c064cf183bb9fd5dd7fafbaaf5fc9c64d566efc1fa10ddc` |
| `add_evidence` | `0xec4e8eb01e16f20d5c3dac731d55614372958b43882040df5e50ad660dfef86d` |
| `add_evidence` | `0x5a7ed9e8ac18a6701bd0bbe789845953f3460ee37e9495230521f32e85b564d1` |
| `publish_claim` | `0x5c5ad3f4a24d6cd9444ad8542e3ebd3d01d4ca9fce71d817fc53ed0b8432e76e` |
| `challenge_claim` | `0x9de5171019be63bc1836953aa059a40d8483be76ee1bbeaf2b809c9ee8411247` |
| `request_evaluation` | `0x3ce022d3e3874f85854c74e307a6acf231892b9563c459916acd4f699ca7be6a` |

## Safety properties

- Required evaluator fields and types are strict; `{ "verdict": "SUPPORTED" }` cannot be accepted.
- Unknown verdicts, malformed JSON, truncation, scalar/list mismatches, oversized output, and parser failures fail safe.
- User content is JSON data, not a delimiter-terminating instruction section.
- Evidence is bounded and claimant-only before publication.
- Challenges are bounded, require a different sender, and stop after finality.
- Finalized claims cannot be challenged or re-evaluated.
- The application verifies finalized status, successful validator execution, and consensus result before canonical readback.

## Historical deployment

Previous deployment, intentionally preserved and not used by the application:

`0x0E6A637e78241D5005245281Bc92d7C3aA09e197`

Its historical deployment/evaluation/read records are in `docs/historical-*`.

This is a security review, not a formal independent audit.
