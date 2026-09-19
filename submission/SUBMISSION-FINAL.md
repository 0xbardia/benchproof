# SUBMISSION-FINAL — copy-paste for the GenLayer portal

Paste the requested block into the portal form. Current proof facts were refreshed after the BenchProof-v1.0.1 deployment on 2026-09-12.

Portal: https://portal.genlayer.foundation/agent-tank/hackathon/submit/

## TRACK

```text
Onchain Justice
```

## PROJECT NAME

```text
BenchProof
```

## TAGLINE

```text
Prove the benchmark, not just the score.
```

## ONE-LINER

```text
GenLayer judges whether evidence fairly supports a published AI benchmark claim, not merely whether one score is larger.
```

## PRIMARY TAG

```text
AI & Agents
```

## TAG 1

```text
Model Evaluation
```

## TAG 2

```text
Source Verification
```

## DESCRIPTION

```text
BenchProof verifies AI benchmark claims. Labs publish a sentence — “Model A is 20% better than Model B” — around a score. A leaderboard can check 87.2 > 84.1. It cannot tell you whether retries, prompts, tools, baselines, or omitted failures make that sentence unfair.

A claimant files the exact statement, models, versions, metric, methodology, conditions, and evidence references. Anyone may challenge on a structured category. A GenLayer Intelligent Contract stores the lifecycle, passes the submitted record as untrusted data to validator LLMs, and reaches consensus on SUPPORTED, PARTIALLY_SUPPORTED, INSUFFICIENT_EVIDENCE, MISLEADING, or INVALID. The contract validates the response strictly; malformed or incomplete output is INVALID, never SUPPORTED.

The current Studionet proof finalized INSUFFICIENT_EVIDENCE because benchmark conditions were described but raw per-task results were not attached. That is the product working: a public judgment over evidence, not a model ranking.
```

## EXPECTED VERIFICATION OUTCOME

```text
Open Claims → on-chain case “Matched SWE-bench Verified run” (id 1). Inspect the claim, two evidence references, the reproducibility challenge, then the canonical verdict INSUFFICIENT_EVIDENCE. Current contract 0x2368a42582710f61AF4f29A432990328db32a2ec on Studionet (61999). Deployment 0xd2b875600a60ef8bff48488441a4e9183940adde5cb6de46e5b5df02637669fa is FINALIZED / MAJORITY_AGREE. Evaluation 0x3ce022d3e3874f85854c74e307a6acf231892b9563c459916acd4f699ca7be6a is FINALIZED / MAJORITY_AGREE / FINISHED_WITH_RETURN. The canonical readback is FINALIZED / INSUFFICIENT_EVIDENCE.
```

## HOW-TO STEPS

1. **Open the landing page** — confirm the tagline and current Studionet proof strip.
2. **Open Claims** — the current `On-chain` row appears before worked examples.
3. **Open the case file** — read the exact statement, models, benchmark, conditions, and date.
4. **Inspect Evidence** — references and hashes are visible; the app does not claim to fetch the files.
5. **Inspect Challenge** — one reproducibility challenge asks for raw trajectories.
6. **Inspect Verdict** — `INSUFFICIENT_EVIDENCE`, source `GenLayer consensus`, status `FINALIZED`.
7. **Inspect Provenance** — follow the current contract, lifecycle transactions, and evaluation explorer link.
8. **Optional worked example** — open `/claims/seed-misleading`; it is labeled a worked example, not canonical consensus.

## CONTRACT LINK

```text
https://explorer-studio.genlayer.com/address/0x2368a42582710f61AF4f29A432990328db32a2ec
```

## WEBSITE

```text
https://benchproof.bydx.fun
```

## DEMO URL / YOUTUBE

Leave empty unless a separate recording is supplied.

## GITHUB REPOSITORY

The source directory is not a Git repository and has no public remote. Publish the source to a repository owned by the linked portal account, then paste its real URL. Do not invent one.

## CONTRACT FACTS

```text
Network: Studionet
Chain ID: 61999
RPC: https://studio.genlayer.com/api
Contract: 0x2368a42582710f61AF4f29A432990328db32a2ec
Version: BenchProof-v1.0.1
Deploy tx: 0xd2b875600a60ef8bff48488441a4e9183940adde5cb6de46e5b5df02637669fa
Deploy status: 7 FINALIZED; result code 6 MAJORITY_AGREE
Evaluation tx: 0x3ce022d3e3874f85854c74e307a6acf231892b9563c459916acd4f699ca7be6a
Evaluation: FINALIZED; MAJORITY_AGREE; FINISHED_WITH_RETURN
Verdict: INSUFFICIENT_EVIDENCE
Public reads: 38/38 PASS
```

## PROBLEM

Benchmark claims are easy to publish and hard to independently verify. Scores can be real while the sentence around them is not: old baselines, cherry-picked tasks, unequal retries or prompts, hidden failed runs, or headlines the numbers do not carry.

## SOLUTION

CLAIM → EVIDENCE → CHALLENGE → GENLAYER EVALUATION → VERDICT. The Intelligent Contract is the canonical judge of whether submitted evidence fairly supports the published sentence. The durable off-chain index is a read model, never an override.

## WHY GENLAYER

A deterministic contract can verify 87.2 > 84.1. It cannot reasonably decide whether both models ran under comparable conditions, whether the baseline is outdated, whether omitted failed runs make the headline misleading, or whether the evidence is sufficient.

BenchProof gives validators the same structured record as untrusted data under `gl.eq_principle.prompt_non_comparative`. They return a strict verdict object and consensus stores the result publicly. A single external LLM is not treated as canonical. Local preview analysis is explicitly separate and cannot set final chain state.

## HOW IT WORKS

File the claim. Attach evidence references and hashes. Publish. Challenge it. Request evaluation. Validators return one of the five verdicts. Required fields, types, bounds, and evidence requirements are strict; parse failure is `INVALID`, never `SUPPORTED`.

## KNOWN LIMITATIONS

V1 evaluates submitted metadata, references, and hashes; it does not retrieve arbitrary evidence URLs. Production writes use operator-controlled service and challenger signers rather than browser wallet ownership. The current rate limiter/sync loop assumes one PM2 instance. There are no bonds, slashing, appeals, or external benchmark adapters.

## ROADMAP

Wallet-native writes, signed evidence manifests, allow-listed evidence adapters, claim bonds, appeals, and benchmark integrations are post-V1 work.

## REPOSITORY DESCRIPTION

```text
BenchProof: a GenLayer Intelligent Contract and web application that judges whether evidence fairly supports a published AI benchmark claim. Not a leaderboard.
```

## 30-SECOND REVIEWER PITCH

Published AI benchmark scores can be technically real and still methodologically unfair. BenchProof records the exact claim, conditions, evidence references, and challenges, then asks GenLayer validators whether the evidence fairly supports the published sentence. The current live case finalized INSUFFICIENT_EVIDENCE because raw per-task results were not attached. That is a judgment artifact, not a greater-than comparison.

## 90-SECOND DEMO NARRATION

This is BenchProof. The question is not whether 72.4 is larger than 54.6. The question is whether the evidence fairly supports the sentence those numbers are wrapped in.

On the landing page, the current Studionet result is claim 1, INSUFFICIENT_EVIDENCE, with majority agreement. Open the case file. The claimant compares two models under disclosed conditions and attaches a harness and benchmark-results reference. A challenge asks for raw trajectories. GenLayer validators return insufficient evidence because the raw per-task artifacts are not present. The application reads that finalized result from the current contract; it is not a local preview or a hardcoded approval.

The worked example shows a different failure: five retries versus one can make a “20% better” headline misleading. It is clearly labeled as an example, not chain consensus.
