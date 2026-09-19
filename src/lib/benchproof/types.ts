import type {
  ChallengeCategory,
  ClaimStatus,
  EvidenceKind,
  TxState,
  VerdictType,
} from "./constants.ts";

export type Conditions = {
  retriesA: string;
  retriesB: string;
  temperatureA: string;
  temperatureB: string;
  maxTokensA: string;
  maxTokensB: string;
  toolsA: string;
  toolsB: string;
  promptParity: "matched" | "unmatched" | "undisclosed";
  systemPromptParity: "matched" | "unmatched" | "undisclosed";
  sampleSize: string;
  exclusions: string;
};

export const EMPTY_CONDITIONS: Conditions = {
  retriesA: "",
  retriesB: "",
  temperatureA: "",
  temperatureB: "",
  maxTokensA: "",
  maxTokensB: "",
  toolsA: "",
  toolsB: "",
  promptParity: "undisclosed",
  systemPromptParity: "undisclosed",
  sampleSize: "",
  exclusions: "",
};

export type EvidenceItem = {
  id: string;
  claimId: string;
  kind: EvidenceKind | string;
  uri: string;
  contentHash: string;
  note: string;
  addedAt: string;
  onchainIndex: number | null;
};

export type ChallengeItem = {
  id: string;
  claimId: string;
  challenger: string;
  category: ChallengeCategory | string;
  reason: string;
  explanation: string;
  evidenceUri: string;
  evidenceHash: string;
  createdAt: string;
  onchainIndex: number | null;
};

export type EvaluationRecord = {
  present: boolean;
  verdict: VerdictType | "";
  confidence: "high" | "medium" | "low" | "";
  summary: string;
  keyFindings: string[];
  materialIssues: string[];
  limitations: string[];
  evidenceReferences: string[];
  evaluatedAt: string;
  evaluatorVersion: string;
  source: "genlayer" | "preview" | "seed" | "";
};

export type ClaimTransaction = {
  id: string;
  claimId: string;
  method: string;
  hash: string;
  status: string;
  detail: string;
  createdAt: string;
};

export type DurableOperationState =
  | "QUEUED"
  | "SUBMITTED"
  | "CONSENSUS_PENDING"
  | "FINALIZED"
  | "FAILED"
  | "RECONCILING";

export type ClaimOperation = {
  type: string;
  state: DurableOperationState;
  transactionHash: string;
  errorCode: string;
  updatedAt: string;
};

export type ClaimRecord = {
  id: string;
  onchainId: number | null;
  claimant: string;
  title: string;
  statement: string;
  modelA: string;
  modelAVersion: string;
  modelB: string;
  modelBVersion: string;
  benchmark: string;
  benchmarkVersion: string;
  evaluationDate: string;
  metric: string;
  reportedResult: string;
  methodology: string;
  sourceUrls: string[];
  conditions: Conditions;
  status: ClaimStatus;
  createdAt: string;
  publishedAt: string;
  evidence: EvidenceItem[];
  challenges: ChallengeItem[];
  evaluation: EvaluationRecord | null;
  transactions: ClaimTransaction[];
  txHash: string;
  txState: TxState | "";
  registry: "onchain" | "index" | "seed";
  scenario?: string;
  evaluationOperation?: ClaimOperation | null;
};

export type ClaimSummary = Pick<
  ClaimRecord,
  | "id"
  | "onchainId"
  | "title"
  | "statement"
  | "claimant"
  | "modelA"
  | "modelB"
  | "benchmark"
  | "metric"
  | "reportedResult"
  | "status"
  | "createdAt"
  | "registry"
> & {
  evidenceCount: number;
  challengeCount: number;
  verdict: VerdictType | "";
};

export type CreateClaimInput = {
  idempotencyKey: string;
  claimant: string;
  title: string;
  statement: string;
  modelA: string;
  modelAVersion: string;
  modelB: string;
  modelBVersion: string;
  benchmark: string;
  benchmarkVersion: string;
  evaluationDate: string;
  metric: string;
  reportedResult: string;
  methodology: string;
  sourceUrls: string[];
  conditions: Conditions;
  evidence: Array<{
    kind: string;
    uri: string;
    contentHash: string;
    note: string;
  }>;
};

export type ChallengeInput = {
  idempotencyKey: string;
  claimId: string;
  challenger: string;
  category: string;
  reason: string;
  explanation: string;
  evidenceUri: string;
  evidenceHash: string;
};

export type NetworkInfo = {
  network: string;
  chainId: number;
  rpc: string;
  explorer: string;
  contractAddress: string;
  deploymentTx: string;
  connected: boolean;
};
