# SCREENSHOT-PLAN

Desktop 1440×900. Captures are from `https://benchproof.bydx.fun` after the v1.0.1 build; no localhost or browser chrome is in the frame.

| File | Shot | What it proves |
| --- | --- | --- |
| `assets/01-hero.png` | Landing page | Identity, tagline, and live canonical verdict |
| `assets/02-claims-ledger.png` | `/claims` ledger | On-chain case first vs explicitly labeled worked examples |
| `assets/03-canonical-case.png` | `/claims/onchain-1` | Claim, evidence, challenge, verdict, and case structure |
| `assets/04-verdict.png` | Case section 04 | `INSUFFICIENT_EVIDENCE` and GenLayer consensus |
| `assets/05-provenance.png` | Case section 05 | Current contract and complete lifecycle transaction provenance |
| `assets/06-worked-example.png` | `/claims/seed-misleading` | Unequal retries as a noncanonical worked example |

Mobile QA includes `assets/qa-mobile-case-320.png`; the full matrix also covered 375×812, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900, and 1920×1080.

## Capture rules

- Wait for the live strip text `INSUFFICIENT_EVIDENCE` before shooting the hero.
- On the on-chain case, wait for status `FINALIZED` and the canonical verdict stamp.
- Do not shoot loading skeletons.
- Do not present Case B as live GenLayer consensus.
