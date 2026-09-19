# BenchProof — product specification

**Tagline:** Prove the benchmark, not just the score.

BenchProof is a decentralized verification and dispute layer for AI benchmark claims. It does not rank models. It judges whether a published *sentence* is fairly supported by submitted evidence and methodology.

## Core flow

CLAIM → EVIDENCE → PUBLIC REVIEW → CHALLENGE → GENLAYER EVALUATION → VERDICT → PERMANENT VERIFICATION PAGE

## V1 scope

A claim includes: title, exact statement, claimant, Model A/B + versions, benchmark + version, evaluation date, metric, reported result, methodology, source URLs, structured evaluation conditions, evidence references and hashes.

Evidence is off-chain. The Intelligent Contract stores hashes and canonical references.

A published claim is challengeable. Categories cover outdated baselines, unequal retries/prompts/tools, leakage, missing samples, misleading headlines, and others. Categories are labels, not truth — GenLayer reasons over the evidence.

## Verdicts

`SUPPORTED` · `PARTIALLY_SUPPORTED` · `INSUFFICIENT_EVIDENCE` · `MISLEADING` · `INVALID`

The evaluator answers: *Does the submitted evidence fairly and reasonably support the published benchmark claim?*

## Non-goals (V1)

Leaderboards, model directories, prediction markets, token bonds/slashing, generic fact-checking chat.

## Identity

If removing GenLayer would not damage the product, the architecture is wrong. The Intelligent Contract is the judge. The UI is the case file.
