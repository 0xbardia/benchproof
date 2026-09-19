import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionResult, TransactionStatus } from "genlayer-js/types";
import { getPublicNetwork } from "./deployment.ts";
import { canonicalClaimCoreMaterial } from "./hash.ts";

export type GenLayerHandle = {
  client: ReturnType<typeof createClient>;
  address: `0x${string}`;
  network: ReturnType<typeof getPublicNetwork>;
};

const STATUS_FROM_INT = ["DRAFT", "OPEN", "CHALLENGED", "EVALUATING", "FINALIZED"] as const;
const MAX_CLAIMS_TO_SCAN = 100;
type TransactionHash = Parameters<ReturnType<typeof createClient>["waitForTransactionReceipt"]>[0]["hash"];
let activeWrites = 0;

export function hasActiveWrite(): boolean {
  return activeWrites > 0;
}

function retryableReceiptError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /rate limit|too many requests|\b429\b|timeout|timed out|fetch failed|temporar/i.test(message);
}

async function waitForReceiptWithBackoff(
  client: ReturnType<typeof createClient>,
  hash: TransactionHash,
  opts: { retries?: number; interval?: number },
) {
  let delay = 5_000;
  for (let attempt = 0; ; attempt++) {
    try {
      return await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        retries: opts.retries ?? 80,
        interval: opts.interval ?? 3000,
      });
    } catch (error) {
      if (!retryableReceiptError(error) || attempt >= 6) throw error;
      console.warn("[benchproof] receipt polling backed off", { attempt: attempt + 1, retryInMs: delay });
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 60_000);
    }
  }
}

export function genlayerConfigured(): boolean {
  const network = getPublicNetwork();
  return (
    network.network === "studionet" &&
    network.chainId === 61999 &&
    /^0x[0-9a-f]{40}$/i.test(network.contractAddress)
  );
}

function assertStudionet(network: ReturnType<typeof getPublicNetwork>): void {
  if (network.network !== "studionet" || network.chainId !== 61999) {
    throw new Error("GenLayer network configuration is not Studionet 61999");
  }
}

export function getReadClient(): GenLayerHandle | null {
  const network = getPublicNetwork();
  if (!network.contractAddress) return null;
  assertStudionet(network);
  const client = createClient({ chain: studionet, endpoint: network.rpc });
  return { client, address: network.contractAddress as `0x${string}`, network };
}

export async function readMethod(functionName: string, args: unknown[] = []) {
  const handle = getReadClient();
  if (!handle) throw new Error("GenLayer contract address is not configured");
  return handle.client.readContract({
    address: handle.address,
    functionName,
    args: args as never,
    jsonSafeReturn: true,
  });
}

export function createWriteClient(privateKey?: `0x${string}`) {
  const network = getPublicNetwork();
  assertStudionet(network);
  const configuredKey = privateKey || process.env.GENLAYER_DEPLOYER_PRIVATE_KEY;
  if (!configuredKey) throw new Error("GenLayer service signer is not configured");
  const account = createAccount(configuredKey as `0x${string}`);
  const client = createClient({ chain: studionet, endpoint: network.rpc, account });
  return { client, account, network };
}

/** Faucet access is for one-time operator setup only, never public requests. */
export async function fundAccount(client: ReturnType<typeof createClient>, address: string) {
  try {
    await client.request({ method: "sim_fundAccount", params: [address as `0x${string}`, 1000] });
  } catch {
    // The operator can already be funded; the next write reports the real failure.
  }
}

export type WriteReceipt = {
  method: string;
  hash: string;
  status: number | string | undefined;
  statusName: string | undefined;
  result: unknown;
  resultName: string | undefined;
  executionResultName: string | undefined;
  stderr: string;
};

function extractStderr(receipt: Record<string, unknown> | undefined): string {
  const consensus = receipt?.consensus_data as
    | { validators?: Array<{ vote?: string; genvm_result?: { stderr?: string } }> }
    | undefined;
  const validator = consensus?.validators?.find((v) => String(v.vote || "").toLowerCase() === "agree");
  return String(validator?.genvm_result?.stderr || "");
}

const RESULT_NAMES: Record<string, string> = {
  "1": TransactionResult.AGREE,
  "2": TransactionResult.DISAGREE,
  "3": TransactionResult.TIMEOUT,
  "4": TransactionResult.DETERMINISTIC_VIOLATION,
  "5": TransactionResult.NO_MAJORITY,
  "6": TransactionResult.MAJORITY_AGREE,
  "7": TransactionResult.MAJORITY_DISAGREE,
};

function resultNameOf(receipt: Record<string, unknown>): string {
  return String(receipt.resultName || receipt.result_name || RESULT_NAMES[String(receipt.result)] || "");
}

function executionResultNameOf(receipt: Record<string, unknown>): string {
  const direct = String(
    receipt.txExecutionResultName ||
      receipt.tx_execution_result_name ||
      ({ "0": ExecutionResult.NOT_VOTED, "1": ExecutionResult.FINISHED_WITH_RETURN, "2": ExecutionResult.FINISHED_WITH_ERROR } as Record<string, string>)[String(receipt.txExecutionResult ?? receipt.tx_execution_result)] ||
      "",
  );
  if (direct) return direct;
  const consensus = receipt.consensus_data as
    | { validators?: Array<{ vote?: string; execution_result?: string }> }
    | undefined;
  const agreeing = (consensus?.validators || []).filter(
    (validator) => String(validator.vote || "").toLowerCase() === "agree",
  );
  if (agreeing.some((validator) => String(validator.execution_result || "").toUpperCase() === "SUCCESS")) {
    return ExecutionResult.FINISHED_WITH_RETURN;
  }
  if (agreeing.some((validator) => String(validator.execution_result || "").toUpperCase() === "ERROR")) {
    return ExecutionResult.FINISHED_WITH_ERROR;
  }
  return "";
}

function isFinalized(receipt: Record<string, unknown>): boolean {
  return receipt.status === 7 || String(receipt.statusName || receipt.status_name || "") === "FINALIZED";
}

function successfulConsensus(resultName: string): boolean {
  return resultName === TransactionResult.MAJORITY_AGREE || resultName === TransactionResult.AGREE;
}

function assertSuccessfulReceipt(
  receipt: Record<string, unknown>,
  functionName: string,
  requireMajority = false,
): void {
  if (!isFinalized(receipt)) throw new Error(`${functionName} did not reach FINALIZED`);
  const execution = executionResultNameOf(receipt);
  if (execution !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(`${functionName} execution did not finish successfully`);
  }
  const resultName = resultNameOf(receipt);
  if (requireMajority ? resultName !== TransactionResult.MAJORITY_AGREE : !successfulConsensus(resultName)) {
    throw new Error(`${functionName} consensus outcome was ${resultName || "unknown"}`);
  }
}

export async function writeMethod(
  client: ReturnType<typeof createClient>,
  address: `0x${string}`,
  functionName: string,
  args: unknown[],
  opts?: {
    retries?: number;
    interval?: number;
    requireMajority?: boolean;
    onSubmitted?: (hash: string) => Promise<void>;
  },
): Promise<WriteReceipt> {
  activeWrites += 1;
  try {
    const hash = await client.writeContract({ address, functionName, args: args as never, value: 0n });
    if (opts?.onSubmitted) {
      try {
        await opts.onSubmitted(String(hash));
      } catch (error) {
        console.error("[benchproof] could not persist submitted transaction", error instanceof Error ? error.message : "unknown error");
      }
    }
    const receipt = (await waitForReceiptWithBackoff(client, hash, opts || {})) as unknown as Record<string, unknown>;
    assertSuccessfulReceipt(receipt, functionName, opts?.requireMajority);
    return {
      method: functionName,
      hash: String(hash),
      status: receipt.status as number | string | undefined,
      statusName: String(receipt.statusName || "") || undefined,
      result: receipt.result,
      resultName: resultNameOf(receipt) || undefined,
      executionResultName: executionResultNameOf(receipt) || undefined,
      stderr: extractStderr(receipt),
    };
  } finally {
    activeWrites -= 1;
  }
}

export type OnchainBundle = {
  claim: Record<string, unknown>;
  evidence: Record<string, unknown>[];
  challenges: Record<string, unknown>[];
  evaluation: Record<string, unknown>;
};

export function statusFromInt(value: unknown): (typeof STATUS_FROM_INT)[number] {
  const status = STATUS_FROM_INT[Number(value)];
  if (!status) throw new Error(`Unknown on-chain claim status: ${String(value)}`);
  return status;
}

export async function fetchOnchainBundle(claimId: number): Promise<OnchainBundle> {
  const claim = (await readMethod("get_claim", [claimId])) as Record<string, unknown>;
  const evN = Number(claim.evidence_count ?? 0);
  const chN = Number(claim.challenge_count ?? 0);
  if (!Number.isInteger(evN) || evN < 0 || evN > 12) throw new Error("Invalid on-chain evidence count");
  if (!Number.isInteger(chN) || chN < 0 || chN > 16) throw new Error("Invalid on-chain challenge count");
  const evidence: Record<string, unknown>[] = [];
  for (let i = 0; i < evN; i++) evidence.push((await readMethod("get_claim_evidence", [claimId, i])) as Record<string, unknown>);
  const challenges: Record<string, unknown>[] = [];
  for (let i = 0; i < chN; i++) challenges.push((await readMethod("get_challenge", [claimId, i])) as Record<string, unknown>);
  const evaluation = (await readMethod("get_evaluation", [claimId])) as Record<string, unknown>;
  return { claim, evidence, challenges, evaluation };
}

export async function fetchOnchainCount(): Promise<number> {
  const count = Number(await readMethod("get_claim_count"));
  if (!Number.isInteger(count) || count < 0 || count > MAX_CLAIMS_TO_SCAN) {
    throw new Error("On-chain claim count exceeds the sync safety bound");
  }
  return count;
}

export type ClaimWriteInput = {
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
  sourceUrls: string;
  conditionsJson: string;
  evidence: Array<{ kind: string; uri: string; contentHash: string; note: string }>;
};

function claimMaterial(input: ClaimWriteInput): string {
  return canonicalClaimCoreMaterial({
    title: input.title,
    statement: input.statement,
    model_a: input.modelA,
    model_a_version: input.modelAVersion,
    model_b: input.modelB,
    model_b_version: input.modelBVersion,
    benchmark: input.benchmark,
    benchmark_version: input.benchmarkVersion,
    evaluation_date: input.evaluationDate,
    metric: input.metric,
    reported_result: input.reportedResult,
    methodology: input.methodology,
    source_urls: input.sourceUrls,
    conditions_json: input.conditionsJson,
  });
}

async function findClaimByMaterial(client: ReturnType<typeof createClient>, address: `0x${string}`, material: string) {
  const count = Number(await client.readContract({ address, functionName: "get_claim_count", args: [] }));
  if (!Number.isInteger(count) || count < 0 || count > MAX_CLAIMS_TO_SCAN) {
    throw new Error("On-chain claim count exceeds the write safety bound");
  }
  for (let id = 1; id <= count; id++) {
    const candidate = await client.readContract({ address, functionName: "get_claim_core_hash_material", args: [id] });
    if (String(candidate) === material) return id;
  }
  return null;
}

let lifecycleLock: Promise<void> | null = null;

async function withLifecycleLock<T>(work: () => Promise<T>): Promise<T> {
  const previous = lifecycleLock || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  lifecycleLock = current;
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (lifecycleLock === current) lifecycleLock = null;
  }
}

export async function submitClaimLifecycle(
  input: ClaimWriteInput,
  onSubmitted?: (method: string, hash: string) => Promise<void>,
): Promise<{
  onchainId: number;
  hashes: string[];
  claimant: string;
  receipts: WriteReceipt[];
}> {
  return withLifecycleLock(async () => {
    const { client, account, network } = createWriteClient();
    if (!network.contractAddress) throw new Error("GenLayer contract address is not configured");
    const address = network.contractAddress as `0x${string}`;
    if (input.evidence.length < 1 || input.evidence.length > 12) throw new Error("Invalid evidence count");
    const material = claimMaterial(input);
    const receipts: WriteReceipt[] = [];
    const write = (functionName: string, args: unknown[]) =>
      writeMethod(client, address, functionName, args, {
        onSubmitted: (hash) => onSubmitted?.(functionName, hash) || Promise.resolve(),
      });
    let onchainId = await findClaimByMaterial(client, address, material);
    if (onchainId == null) {
      receipts.push(await write("create_claim", [
        input.title,
        input.statement,
        input.modelA,
        input.modelAVersion,
        input.modelB,
        input.modelBVersion,
        input.benchmark,
        input.benchmarkVersion,
        input.evaluationDate,
        input.metric,
        input.reportedResult,
        input.methodology,
        input.sourceUrls,
        input.conditionsJson,
      ]));
      onchainId = await findClaimByMaterial(client, address, material);
      if (onchainId == null) throw new Error("Created claim could not be confirmed by canonical readback");
    }

    const currentEvidence = Number(await client.readContract({ address, functionName: "get_evidence_count", args: [onchainId] }));
    if (!Number.isInteger(currentEvidence) || currentEvidence < 0 || currentEvidence > input.evidence.length) {
      throw new Error("Existing on-chain evidence does not match this operation");
    }
    for (let i = currentEvidence; i < input.evidence.length; i++) {
      const ev = input.evidence[i];
      receipts.push(await write("add_evidence", [onchainId, ev.kind, ev.uri, ev.contentHash, ev.note]));
    }
    const status = String(await client.readContract({ address, functionName: "get_status_name", args: [onchainId] }));
    if (status === "DRAFT") receipts.push(await write("publish_claim", [onchainId]));
    else if (!["OPEN", "CHALLENGED", "EVALUATING", "FINALIZED"].includes(status)) {
      throw new Error(`Unexpected on-chain claim status: ${status}`);
    }

    const confirmedMaterial = String(await client.readContract({ address, functionName: "get_claim_core_hash_material", args: [onchainId] }));
    const confirmedEvidence = Number(await client.readContract({ address, functionName: "get_evidence_count", args: [onchainId] }));
    if (confirmedMaterial !== material || confirmedEvidence !== input.evidence.length) {
      throw new Error("Canonical claim readback did not match the submitted claim");
    }
    return { onchainId, hashes: receipts.map((receipt) => receipt.hash), claimant: String(account.address), receipts };
  });
}

export async function submitChallengeOnchain(input: {
  claimId: number;
  category: string;
  reason: string;
  explanation: string;
  evidenceUri: string;
  evidenceHash: string;
}): Promise<WriteReceipt & { challenger: string }> {
  const challengerKey = process.env.GENLAYER_CHALLENGER_PRIVATE_KEY?.trim();
  if (!challengerKey) throw new Error("GenLayer challenger signer is not configured");
  const { client, account, network } = createWriteClient(challengerKey as `0x${string}`);
  if (!network.contractAddress) throw new Error("GenLayer contract address is not configured");
  const receipt = await writeMethod(client, network.contractAddress as `0x${string}`, "challenge_claim", [
    input.claimId,
    input.category,
    input.reason,
    input.explanation,
    input.evidenceUri,
    input.evidenceHash,
  ]);
  return { ...receipt, challenger: String(account.address) };
}

export async function requestEvaluationOnchain(
  claimId: number,
  onSubmitted?: (hash: string) => Promise<void>,
): Promise<WriteReceipt> {
  const { client, network } = createWriteClient();
  if (!network.contractAddress) throw new Error("GenLayer contract address is not configured");
  return writeMethod(client, network.contractAddress as `0x${string}`, "request_evaluation", [claimId], {
    retries: 120,
    interval: 5000,
    requireMajority: true,
    onSubmitted,
  });
}

export const READ_METHODS: Array<{ name: string; args: unknown[]; note: string }> = [
  { name: "get_claim_count", args: [], note: "total claims" },
  { name: "get_contract_version", args: [], note: "contract version" },
  { name: "get_deployer", args: [], note: "deployer address" },
  { name: "get_limits", args: [], note: "input bounds" },
  { name: "get_challenge_categories", args: [], note: "category enum" },
  { name: "get_verdict_types", args: [], note: "verdict enum" },
  { name: "get_claim", args: [1], note: "claim record" },
  { name: "get_claim_status", args: [1], note: "claim status" },
  { name: "get_status_name", args: [1], note: "status name" },
  { name: "get_claim_verdict", args: [1], note: "claim verdict" },
  { name: "get_claimant", args: [1], note: "claimant" },
  { name: "get_claim_evidence", args: [1, 0], note: "evidence item" },
  { name: "get_evidence_count", args: [1], note: "evidence count" },
  { name: "get_challenge_count", args: [1], note: "challenge count" },
  { name: "get_challenge", args: [1, 0], note: "challenge item" },
  { name: "get_evaluation", args: [1], note: "evaluation record" },
  { name: "is_finalized", args: [1], note: "finality flag" },
  { name: "can_challenge", args: [1], note: "challenge permission" },
  { name: "can_add_evidence", args: [1], note: "evidence permission" },
  { name: "can_evaluate", args: [1], note: "evaluation permission" },
  { name: "get_claim_core_hash_material", args: [1], note: "canonical hash material" },
];
