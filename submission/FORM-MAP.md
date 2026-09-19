# FORM-MAP — current GenLayer Agent Tank submission form

Inspected 2026-09-12 from the live portal bundle:

- Page: [https://portal.genlayer.foundation/agent-tank/hackathon/submit/](https://portal.genlayer.foundation/agent-tank/hackathon/submit/)
- Asset: `https://portal.genlayer.foundation/assets/index-0K-pNiX6.js`
- The HTML shell is public. The form itself is **wallet-gated** (`Connect wallet to submit`) and requires the **Builder** portal role.

Character limits below are taken from the current JS bindings (`maxlength` + live counters), not from memory.

## Hackathon wrapper (wallet + builder required)

| Field | Limit | Required | Final value | Evidence / source |
| --- | --- | --- | --- | --- |
| Track | enum | yes | **Onchain Justice** | Portal track copy: “Disputes, appeals and rule enforcement decided from evidence.” |
| GitHub repository | URL | yes | **https://github.com/0xbardia/benchproof** | Portal: “Paste the GitHub repository of your build.” Must belong to the linked GitHub account. |
| Save / Submit project | — | yes | (author clicks in portal) | One project per portal account; editable until 17 Sep 2026 15:30 UTC. |

Tracks on the current form (exact labels):

1. Agentic Commerce Infrastructure
2. **Onchain Justice**
3. Prediction Markets & Real-World Settlement
4. AI Governance
5. Future of Work
6. Autonomous Protocols

BenchProof is a dispute over evidence, not commerce rails. Track = Onchain Justice.

## Project application (explorer fields, 7 sections)

The hackathon submit flow embeds the Project Explorer application. Complete every section before submitting.

| # | Field (UI label) | Form key | Limit | Required | Final value |
| --- | --- | --- | --- | --- | --- |
| 01 | Project name | `name` | **120** | yes | `BenchProof` (10) |
| 01 | Logo | file | PNG/JPEG/WebP, 128–2048 px, ≤ 2 MB | no | [`public/og.jpg`](../public/og.jpg) |
| 01 | Primary tag | `primary_tag` | enum | yes | **AI & Agents** |
| 01 | Tag 1 / Tag 2 | `tags[0]`, `tags[1]` | 2 max, must belong to primary | no | **Model Evaluation**, **Source Verification** |
| 02 | One-liner | `expected_result` | **180** | yes | see SUBMISSION-FINAL (121) |
| 03 | Description / What is this project? | `try_it` | **1000** | yes | see SUBMISSION-FINAL (910) |
| 04 | YouTube URL · optional | `demo_video_url` | **500** | no | leave empty (no recording in this workspace) |
| 05 | Prove the path works — How-to steps | `instructions[]` | title **120**, up to **12** steps | yes | 6 steps in SUBMISSION-FINAL |
| 06 | Expected verification outcome | `verification_outcome` | **500** | yes | see SUBMISSION-FINAL (488) |
| 06 | Contract link (optional) | `deployments[]` | Studio / Studio Dev / Bradbury / Asimov **explorer address** URLs, up to 12 | no | `https://explorer-studio.genlayer.com/address/0x2368a42582710f61AF4f29A432990328db32a2ec` |
| 07 | Website · required | `socials.website` | URL | yes | **https://benchproof.bydx.fun** |
| 07 | GitHub (application socials) | `socials.github` | URL | shown | **https://github.com/0xbardia/benchproof** |

`Claim Attestation` exists as a tag in the portal taxonomy. The form allows **two** tags under the primary. Prefer Model Evaluation + Source Verification; do not add a third.

## “Prove the path works”

This is **not** a single 450-character field on the current form.

- Section heading: **Prove the path works** (`ui_explorer_application_fields_prove_the_path_works`)
- How-to steps (`instructions`) — “Write the exact path”
- Expected verification outcome (`verification_outcome`) — **500 character** counter in the current JS (`maxlength` 500)

A previous reconstruction mentioned 450 characters. The live bundle on 2026-09-12 uses **500**. Final copy is 488 characters so it also fits a 450 *or* 500 box if the portal A/B’s the limit. A dedicated 450-character fallback is included in SUBMISSION-FINAL.

## Categories vs tracks

Do not confuse:

| Layer | BenchProof choice |
| --- | --- |
| Hackathon **track** | Onchain Justice |
| Explorer **primary tag** | AI & Agents |
| Explorer **tags** | Model Evaluation, Source Verification |

`Dispute Resolution` is also a valid primary tag. Track already covers justice; primary tag stays **AI & Agents** because the evidence is benchmark methodology.

## What the live form did *not* expose as separate fields

These are still prepared in SUBMISSION-FINAL so they can be pasted if a steward form variant asks:

- Tagline
- Short / medium / full description
- Problem / Solution / Why GenLayer / How it works
- Roadmap / Known limitations
- 30-second pitch / 90-second narration

## Access notes

- Submit page robots: `noindex,nofollow`
- Recaptcha is loaded
- Builder journey must be complete (`Hackathon submissions are reserved for GenLayer builders`)
- GitHub account must be linked to the portal wallet
