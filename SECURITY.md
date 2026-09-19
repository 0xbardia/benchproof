# Security

BenchProof V1 is a security-reviewed implementation, not a formal independent audit.

## Do not publish secrets

Never open an issue or pull request that includes:

- private keys or mnemonics
- `.env` files
- production database dumps
- API tokens or session cookies

## Reporting a vulnerability

Email or privately message the repository owner ([0xbardia](https://github.com/0xbardia)) with:

- a description of the issue
- affected component (web app, Intelligent Contract, or index)
- steps to reproduce without live production mutation if possible

Do not file a public issue for exploitable bugs until a fix is available.

## Production notes

- The Intelligent Contract does not fetch arbitrary evidence URLs.
- Public mutations are rate-limited in-process and use operator-controlled signers in V1.
- Finalized on-chain claims must not be rewritten.
