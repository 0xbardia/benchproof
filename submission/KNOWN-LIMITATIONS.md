# KNOWN-LIMITATIONS

These are genuine V1 boundaries, not hidden defects:

- The contract evaluates submitted metadata, references, and hashes. It does not retrieve arbitrary evidence URLs.
- Production writes use operator-controlled service and challenger signers. The claimant/reviewer display fields are not authenticated wallet identities.
- The rate limiter is in-process and the sync loop assumes one PM2 instance. A scaled deployment needs shared rate limiting and a worker.
- Chain synchronization is bounded to 100 claims and runs in the background at a 60-second cadence.
- File-backed PGlite is supported for the current single-instance deployment; PostgreSQL is preferred when available.
- V1 has no claim bonds, staking, slashing, appeals, arbitrary evidence adapters, or benchmark-provider integrations.
- The optional xAI preview evaluator is non-canonical and only applies to off-chain cases; it cannot set a GenLayer final verdict.

The previous contract deployment remains available as historical evidence but is not the application’s current source of truth.
