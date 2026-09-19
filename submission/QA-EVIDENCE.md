# QA-EVIDENCE

Collected 2026-09-12 after the v1.0.1 deployment and final production build.

## Release evidence

| Item | Result |
| --- | --- |
| Current build | PASS · complete `.vercel/output` fingerprint `ada7a37aa877c79c4b228c8897e5b026ed7164445814f411dbd0493600382445`; server entry SHA-256 `1009571df123188f290f0a3ab48bc6f55eb07138d849249e6b6fb90dbdb6db84` |
| Current contract | `0x2368a42582710f61AF4f29A432990328db32a2ec` · Studionet 61999 |
| Current evaluation | `0x3ce022d3e3874f85854c74e307a6acf231892b9563c459916acd4f699ca7be6a` · FINALIZED / MAJORITY_AGREE / FINISHED_WITH_RETURN |
| Canonical readback | PASS · claim 1 FINALIZED / INSUFFICIENT_EVIDENCE |
| Canonical URL | `https://benchproof.bydx.fun/` present in served document metadata |
| Historical deployment | Preserved separately as v1.0.0 evidence; not overwritten |

## Commands and results

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS · 0 errors, 3 existing warnings |
| Test suite | `npm test` | PASS · 198 script tests + 79 TypeScript tests, 0 failures |
| Production build | `npm run build` | PASS |
| Contract safety | `node scripts/contract-safety.test.mjs` via `npm test` | PASS |
| Public reads | `node scripts/studio-read-methods.mjs` evidence | 38/38 PASS, including invalid-input checks |
| Write verification | `docs/write-method-matrix.json` | 5/5 finalized writes with canonical readback |
| App routes | production HTTP probes | PASS · expected 404 only for unknown route |

Adversarial coverage includes incomplete `SUPPORTED`, malformed JSON, unknown verdicts, wrong types, extra fields, truncation, prompt-injection text, delimiter collisions, oversized payloads, SSRF guards, state transitions, hash parity, and worked-example finality boundaries.

## On-chain claim 1 after evaluation

From `docs/read-method-matrix.json`:

- status: `FINALIZED`
- verdict: `INSUFFICIENT_EVIDENCE`
- is_finalized: `true`
- can_challenge: `false`
- can_evaluate: `false`
- evaluation.present: `true`
- evaluator version: `BenchProof-v1.0.1`
- canonical provenance: deployment, create, two evidence, publish, challenge, and evaluation transactions retained

## Browser QA

Playwright CLI with real Chromium ran against `https://benchproof.bydx.fun`.

- Main routes `/`, `/claims`, `/claims/onchain-1`, `/claims/onchain-1/challenge`, `/claims/new`, `/docs`, `/methodology`, and `/roadmap`: HTTP 200, visible content, no horizontal overflow, no page errors, no failed requests, and no bad subresource responses.
- Unknown route: HTTP 404 with a styled BenchProof not-found page. Chromium reports the expected 404 response as a console error; no application runtime error occurs.
- Mobile menu: opened and closed at 390×844; mobile navigation exposed all expected links.
- Form audit: 27 controls inspected; 0 unlabeled controls.
- Viewport matrix: 320×568, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900, and 1920×1080; all landing and canonical case checks passed.
- 125% desktop equivalent: 1024×640 CSS viewport (nominal 1280×800 at 125%); landing and canonical case remained visible with no horizontal overflow.
- Required platform extension request to `https://grok.com/grok-app-builder/extensions.js` is infrastructure, not BenchProof product attribution.

## Screenshots

Fresh captures from the final production build:

| File | Proves |
| --- | --- |
| `assets/01-hero.png` | Tagline, live canonical Studionet verdict, and product story |
| `assets/02-claims-ledger.png` | On-chain case first, worked examples explicitly labeled |
| `assets/03-canonical-case.png` | Case-file claim, evidence, challenge, verdict, and provenance |
| `assets/04-verdict.png` | Canonical GenLayer verdict and findings |
| `assets/05-provenance.png` | Contract address and complete lifecycle transaction list |
| `assets/06-worked-example.png` | Noncanonical unequal-retry worked example |
| `assets/qa-mobile-case-320.png` | 320px mobile case-file overflow/legibility check |

## Infrastructure

- PM2 process `benchproof`: online, single instance, loopback port 4300, explicit file-backed PGlite directory.
- Nginx: configuration test successful; proxy target `127.0.0.1:4300`.
- HTTPS: certificate valid for `benchproof.bydx.fun`; HSTS, `nosniff`, referrer policy, and permissions policy present.
- Repeated safe production requests: no post-release 500s; normal warm SSR responses remained sub-second. Historical transition-time abort/module errors are not present in the final restart tail.
