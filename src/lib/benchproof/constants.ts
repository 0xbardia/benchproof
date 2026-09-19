export const APP_NAME = "BenchProof";
export const APP_TAGLINE = "Prove the benchmark, not just the score.";
export const CONTRACT_VERSION = "BenchProof-v1.0.1";

export const STATUSES = [
  "DRAFT",
  "OPEN",
  "CHALLENGED",
  "EVALUATING",
  "FINALIZED",
] as const;

export type ClaimStatus = (typeof STATUSES)[number];

export const VERDICTS = [
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "INSUFFICIENT_EVIDENCE",
  "MISLEADING",
  "INVALID",
] as const;

export type VerdictType = (typeof VERDICTS)[number];

export const CHALLENGE_CATEGORIES = [
  "outdated_baseline",
  "benchmark_version_mismatch",
  "dataset_cherry_picking",
  "unequal_prompts",
  "unequal_system_prompts",
  "unequal_retry_count",
  "unequal_tool_access",
  "inference_configuration_mismatch",
  "excluded_failed_runs",
  "metric_manipulation",
  "contamination_leakage",
  "insufficient_sample_size",
  "unsupported_generalization",
  "misleading_headline",
  "reproducibility_problem",
  "undisclosed_methodology_difference",
  "prompt_injection_in_evidence",
  "other",
] as const;

export type ChallengeCategory = (typeof CHALLENGE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  outdated_baseline: "Outdated baseline",
  benchmark_version_mismatch: "Benchmark version mismatch",
  dataset_cherry_picking: "Dataset cherry-picking",
  unequal_prompts: "Unequal prompts",
  unequal_system_prompts: "Unequal system prompts",
  unequal_retry_count: "Unequal retry count",
  unequal_tool_access: "Unequal tool access",
  inference_configuration_mismatch: "Inference configuration mismatch",
  excluded_failed_runs: "Excluded failed runs",
  metric_manipulation: "Metric manipulation",
  contamination_leakage: "Contamination / leakage",
  insufficient_sample_size: "Insufficient sample size",
  unsupported_generalization: "Unsupported generalization",
  misleading_headline: "Misleading headline",
  reproducibility_problem: "Reproducibility problem",
  undisclosed_methodology_difference: "Undisclosed methodology difference",
  prompt_injection_in_evidence: "Prompt injection in evidence",
  other: "Other",
};

export const EVIDENCE_KINDS = [
  "report",
  "raw_results",
  "harness",
  "config",
  "artifact",
  "source",
  "note",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  report: "Benchmark report",
  raw_results: "Raw results",
  harness: "Harness / code",
  config: "Run configuration",
  artifact: "Artifact hash",
  source: "Source URL",
  note: "Method note",
};

export const LIMITS = {
  title: 200,
  statement: 2000,
  methodology: 4000,
  sourceUrls: 1500,
  conditions: 1200,
  model: 120,
  version: 80,
  benchmark: 160,
  metric: 80,
  result: 240,
  date: 32,
  uri: 512,
  hash: 128,
  note: 1000,
  reason: 400,
  explanation: 2000,
  evidence: 12,
  challenges: 16,
  claimant: 80,
  idempotencyKey: 128,
} as const;

export const TX_STATES = [
  "preparing",
  "awaiting_confirmation",
  "submitted",
  "consensus_pending",
  "finalized",
  "failed",
] as const;

export type TxState = (typeof TX_STATES)[number];

export const TX_STATE_LABELS: Record<TxState, string> = {
  preparing: "Preparing",
  awaiting_confirmation: "Awaiting confirmation",
  submitted: "Submitted",
  consensus_pending: "Consensus pending",
  finalized: "Finalized",
  failed: "Failed",
};
