# Security model

This document describes the implemented V1 controls. It is a security review, not a formal independent audit.

## Threat: prompt injection in submitted data

Claim fields, evidence, source references, and challenge text are untrusted. The contract serializes them as values inside an `untrusted_data` JSON object and passes the evaluation task/criteria separately. The evaluator must return exactly seven fields with strict types, finite verdicts, bounded arrays, and non-empty summary. Parse failure, unknown verdict, malformed types, oversized output, and incomplete `SUPPORTED` output become `INVALID`.

## Threat: illegal lifecycle

Finalized claims cannot reopen. Evidence is limited and locks at publish. Challenges are limited and stop when evaluation begins. The contract derives claimant/challenger identity from the transaction sender, so a claimant cannot self-challenge. The application only reports a challenge after the chain write and canonical readback succeed.

## Threat: local state impersonating consensus

The index distinguishes `seed`, `index`, and `onchain` records. Preview evaluations are stored with source `preview` and are available only for off-chain open cases. Only a finalized contract read with a `genlayer` evaluation can produce the canonical verdict presentation. Unknown on-chain statuses fail closed.

## Threat: SSRF and malicious URLs

The application accepts safe `http(s)`, `ipfs`, and hash references, rejects localhost, link-local, RFC1918, and metadata hosts, and never fetches arbitrary evidence URLs. URLs are rendered as external links with `noreferrer`; they are not trusted as proof by themselves.

## Threat: replay, double-submit, and abuse

Mutation routes require same-origin / same-site request signals, enforce a 64 KB request-size ceiling, validate per-field limits, and use durable idempotency records for claim creation, challenges, and evaluations. The single PM2 process has server-side per-operation rate limits. A separate operator challenger signer prevents the service signer from self-challenging its own claims.

The current limiter is in-process and therefore a single-instance control. A horizontally scaled deployment needs a shared limiter and worker queue before it is treated as equivalent.

## Threat: persistence failure

Production refuses to start without either `DATABASE_URL` or an explicit `PGLITE_DATA_DIR`; it does not silently use an in-memory database. Migrations create the claims, child records, transaction provenance, idempotency, and sync-run tables. File-backed PGlite is appropriate only for the current single-instance V1.

## Threat: secrets and error leakage

Signer keys and the optional external evaluator key are server-only. No `VITE_*` value contains a secret. Public mutation errors use safe messages; detailed failures are logged server-side. The optional xAI model path is preview-only, bounded by timeout/rate controls, and cannot write canonical GenLayer state.

## Infrastructure

The application binds to loopback port 4300 behind Nginx/HTTPS. Low-risk response headers are applied by the app: `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`. A strict frame policy/CSP is intentionally not asserted at the app layer because the required preview/auth/runtime platform paths and external font/script loading still need an incremental proxy-level policy review.

## V1 non-goals

Economic bonds, slashing, appeals, wallet-native ownership, arbitrary web retrieval, and multi-instance worker coordination are not implemented.
