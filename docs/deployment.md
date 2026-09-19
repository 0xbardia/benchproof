# Deployment record

## Application

The production app is a TanStack Start / Nitro build served by the `benchproof` PM2 process on `127.0.0.1:4300`, behind Nginx and HTTPS at `https://benchproof.bydx.fun`. Production persistence is PostgreSQL when `DATABASE_URL` exists; otherwise the process requires the explicit file-backed `PGLITE_DATA_DIR`. Builds use `npm run build`.

## Intelligent Contract

Network: **Studionet**  
RPC: `https://studio.genlayer.com/api`  
Chain ID: **61999**  
Studio: `https://studio.genlayer.com/contracts`  
Version: **BenchProof-v1.0.1**

Repeatable operator script:

```text
node scripts/deploy-genlayer.mjs
```

It requires `GENLAYER_DEPLOYER_PRIVATE_KEY`, fingerprints `contracts/benchproof.py`, validates finalized status and consensus result code, and writes `docs/deployment-result.json` relative to the project root. It does not use or overwrite the historical deployment.

## Current deployment

| Field | Value |
| --- | --- |
| Contract | `0x2368a42582710f61AF4f29A432990328db32a2ec` |
| Deploy tx | `0xd2b875600a60ef8bff48488441a4e9183940adde5cb6de46e5b5df02637669fa` |
| Finalization | status 7 FINALIZED · result code 6 MAJORITY_AGREE |
| Source fingerprint | `ec09686724ad2b2a1d1f8784eb9d6787a949be1bf55e1aaae2cec3bf02c5dfa9` |
| Deployer | `0x54e59A388861F5E7f29b75d7cf1D33Cf4fDF0967` |

## Current proof case

Claim 1 was created, given two evidence items, published, challenged by a separate signer, and evaluated on the current contract. The write matrix is `docs/write-method-matrix.json`; the complete public-read matrix is `docs/read-method-matrix.json`.

| Field | Value |
| --- | --- |
| Evaluation tx | `0x3ce022d3e3874f85854c74e307a6acf231892b9563c459916acd4f699ca7be6a` |
| Receipt | status 7 FINALIZED · result code 6 MAJORITY_AGREE |
| Execution | `FINISHED_WITH_RETURN` derived from successful agreeing validator execution |
| GenVM stderr | empty |
| Final status | `FINALIZED` |
| Verdict | `INSUFFICIENT_EVIDENCE` |
| Reason | Benchmark identity and conditions were disclosed, but raw per-task results/trajectories were not attached. |

The actual evaluation was accepted as returned; no retry was made to seek a different verdict.

## Historical deployment

The previous contract remains preserved at `0x0E6A637e78241D5005245281Bc92d7C3aA09e197`. Its deployment, evaluation, and read evidence are archived as `docs/historical-deployment-v1.0.0.json`, `docs/historical-evaluation-v1.0.0.json`, and `docs/historical-read-method-matrix-v1.0.0.json`. It is not the application’s current contract.

## Safe lifecycle

1. Validate and persist a draft with an idempotency key.
2. Find an existing canonical claim by the complete hash material before creating one.
3. Submit each required chain write and wait for finalized status, successful execution, and an agreeing result.
4. Read the canonical claim back before updating the local mirror.
5. Run background bounded synchronization; ordinary GET rendering never performs synchronization writes.
