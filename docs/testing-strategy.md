# Testing strategy

| Layer | What | Command / artifact |
| --- | --- | --- |
| Unit | Forensic scenarios, strict output parser, state machine, validation, SSRF, hash parity | `npm test` |
| Contract safety | Source/schema gate for strict evaluator boundary and structured untrusted payload | `scripts/contract-safety.test.mjs` |
| Static | TypeScript correctness | `npm run typecheck` |
| Lint | ESLint | `npm run lint` |
| Build | Production Vite/Nitro bundle and migration gate | `npm run build` |
| Browser | Real Chromium routes, interaction, console, network, responsive layout | Playwright against production |
| Contract writes | Versioned Studionet lifecycle and real evaluation | `docs/write-method-matrix.json`, `docs/evaluation-result.json` |
| Contract reads | Every public view plus invalid IDs | `docs/read-method-matrix.json` |

Current local result: 198 script tests and 79 TypeScript tests pass (277 total); typecheck passes; lint has zero errors. The v1.0.1 contract lifecycle and all 21 public views pass on the current deployment, with invalid ID cases failing safely.

Negative paths include missing evidence, illegal transitions, private URLs, malformed JSON verdicts, unknown verdicts, incomplete `SUPPORTED`, extra fields, scalar/list mismatches, oversized output, prompt injection, delimiter collision, finality guards, and hash coverage.

The contract deployment and live evaluation are evidence-bearing operator checks, not mocks. No test helper mutates the historical contract.
