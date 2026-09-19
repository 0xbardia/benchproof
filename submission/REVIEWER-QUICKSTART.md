# REVIEWER-QUICKSTART

## 1. Live app

Open https://benchproof.bydx.fun.

The core path is: claim → evidence → challenge → GenLayer verdict.

## 2. Current contract

`0x2368a42582710f61AF4f29A432990328db32a2ec`  
https://explorer-studio.genlayer.com/address/0x2368a42582710f61AF4f29A432990328db32a2ec

Studionet · chain 61999 · `BenchProof-v1.0.1`

## 3. Proof transactions

Deployment: `0xd2b875600a60ef8bff48488441a4e9183940adde5cb6de46e5b5df02637669fa`  
Evaluation: `0x3ce022d3e3874f85854c74e307a6acf231892b9563c459916acd4f699ca7be6a`

Both finalized with `MAJORITY_AGREE`; the evaluation execution finished with return and its canonical readback is `FINALIZED / INSUFFICIENT_EVIDENCE`.

## 4. Where the verdict is

- App: `/claims/onchain-1` → **04 · What was decided**
- Landing proof strip: Claim 1 · `INSUFFICIENT_EVIDENCE`
- Chain: `get_claim_verdict(1)` → `INSUFFICIENT_EVIDENCE`

The case has two evidence references and one reproducibility challenge. The verdict says the benchmark conditions are described but raw per-task results/trajectories are absent.

## 5. Reviewer path

1. Open the landing page and read the tagline.
2. Open Claims; the live on-chain row appears before worked examples.
3. Open the on-chain case; inspect claim, evidence, challenge, verdict, and provenance.
4. Follow the contract and evaluation links in the provenance section.
5. Open `/claims/seed-misleading` for a worked example of unequal retries; it is explicitly not GenLayer consensus.

## 6. Documentation

- [README.md](../README.md)
- [docs/architecture.md](../docs/architecture.md)
- [docs/deployment.md](../docs/deployment.md)
- [docs/evaluation-result.json](../docs/evaluation-result.json)
- [docs/read-method-matrix.json](../docs/read-method-matrix.json)
- [CONTRACT-PROOF.md](CONTRACT-PROOF.md)
- [TECHNICAL-PROOF.md](TECHNICAL-PROOF.md)

## 7. Honest V1 limits

- The contract judges submitted metadata, references, and hashes; it does not retrieve arbitrary URLs.
- Production writes use operator-controlled service and challenger signers, not browser wallet ownership.
- The current per-process rate limiter and sync loop are sized for one PM2 instance.
- There are no bonds, slashing, appeals, or multi-instance worker coordination.

The previous v1.0.0 deployment is retained as historical evidence only.
