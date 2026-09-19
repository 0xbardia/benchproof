# DEMO-SCRIPT

## 60–90 second path

1. Open `https://benchproof.bydx.fun`. Start with: “The question is not whether one score is larger. It is whether the evidence fairly supports the published sentence.”
2. Point to the landing proof strip: current Studionet claim 1 is `FINALIZED / INSUFFICIENT_EVIDENCE`.
3. Open **Claims**. The `On-chain` row is first; the other rows are labeled `Example`.
4. Open the live case `/claims/onchain-1`.
5. Read **01 · What was claimed**: model versions, benchmark version, date, metric, and conditions.
6. Read **02 · What evidence was provided**: two references/hashes, not a claim that the app fetched the files.
7. Read **03 · What was challenged**: a reproducibility challenge asks for raw trajectories.
8. Read **04 · What was decided**: `INSUFFICIENT_EVIDENCE`, marked `GenLayer consensus`, with reasoning and limitations.
9. Read **05 · Verification**: current contract, all retained lifecycle transaction IDs, and the evaluation explorer link.

## Narration

“BenchProof is not a leaderboard. It records a claim, the experiment conditions, explicit evidence, and public challenges. GenLayer validators then answer a narrower question: does that evidence fairly support the sentence?

The live claim compares Claude Opus 4.1 and GPT-4.1 on SWE-bench Verified. The conditions are disclosed and the case includes a harness reference and benchmark-results reference. A challenger asks for raw trajectories. GenLayer reaches majority agreement on an insufficient-evidence verdict because the raw per-task artifacts are not present. The application reads that finalized result back from the current contract; it is not a local preview or hardcoded approval.

Case B is a worked example, not chain consensus: it shows how five retries versus one can make a ‘20% better’ headline misleading.”

## Proof facts

- Current contract: `0x2368a42582710f61AF4f29A432990328db32a2ec`
- Deployment: `0xd2b875600a60ef8bff48488441a4e9183940adde5cb6de46e5b5df02637669fa`
- Evaluation: `0x3ce022d3e3874f85854c74e307a6acf231892b9563c459916acd4f699ca7be6a`
- Network: Studionet, chain 61999
- Consensus: `MAJORITY_AGREE`
- Execution: `FINISHED_WITH_RETURN`
- Verdict: `INSUFFICIENT_EVIDENCE`

Do not request another evaluation of claim 1; it is finalized. Do not submit a claim or challenge during a public demo unless a separate test deployment is being used.
