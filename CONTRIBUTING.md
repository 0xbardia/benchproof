# Contributing to BenchProof

Thank you for looking at the source. Keep changes small and verifiable.

## Ground rules

- Do not commit `.env`, keys, databases, or logs.
- Do not mutate the live Studionet contract or production data from a local clone.
- Match the current contract identity in docs: `0x2368a42582710f61AF4f29A432990328db32a2ec`.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

## Checks before a PR

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

All of those should pass. Do not delete tests to get a green run.

## Scope

Prefer fixes and documentation that match current behavior. New features belong on the roadmap unless they are required for correctness or safety.
