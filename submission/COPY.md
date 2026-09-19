# COPY — spare fields and longer prose

Use [SUBMISSION-FINAL.md](SUBMISSION-FINAL.md) for anything that goes into the portal. This file holds extra prose for README, stewards, or a form variant.

## What BenchProof is not

- a generic benchmark leaderboard
- an AI model ranking website
- a chatbot
- a generic fact checker
- a prediction market
- a simple score comparison tool

The central question resolved by GenLayer:

> Does the submitted evidence fairly and reasonably support the published benchmark claim?

## Issues the evaluator can reason about

unequal retries · outdated baseline · different prompts · different system prompts · benchmark version mismatch · cherry-picked tasks · omitted failed runs · methodology mismatch · insufficient raw evidence · misleading generalization · contamination · unsupported headline language

None of these reduce to `scoreA > scoreB`.

## Intelligent contract, short

A claim is recorded. Evidence metadata is associated. A challenge may be filed. Evaluation is requested. GenLayer validators judge whether the evidence supports the exact claim. Consensus writes a structured verdict onto the case.

## Security approach (short)

Untrusted wrapping, structured verdict schema, bounded inputs, fail-safe INVALID, legal transitions, finalized-state lock, no arbitrary URL fetch, SSRF guards on the index. **Security review, not audited.**

## Roadmap (short)

V1.1 wallet-native writes · V1.2 signed evidence manifests · V1.3 allow-listed evidence adapters · V1.4 claim bonds · V1.5 benchmark integrations. No dates.
