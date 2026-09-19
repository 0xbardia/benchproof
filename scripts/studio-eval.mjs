#!/usr/bin/env node
/** Trigger and verify the canonical GenLayer evaluation for a live claim. */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

const RPC = process.env.VITE_GENLAYER_RPC || "https://studio.genlayer.com/api";
const address = process.env.VITE_GENLAYER_CONTRACT_ADDRESS?.trim();
const claimId = Number(process.env.CLAIM_ID || 1);
if (!address) throw new Error("VITE_GENLAYER_CONTRACT_ADDRESS is required");
if (!Number.isInteger(claimId) || claimId < 1) throw new Error("CLAIM_ID must be a positive integer");

const account = createAccount();
const client = createClient({ chain: studionet, endpoint: RPC, account });

async function read(functionName, args = []) {
  return client.readContract({ address, functionName, args });
}

function stderrFrom(receipt) {
  const validators = receipt?.consensus_data?.validators || [];
  const agree = validators.find((v) => String(v?.vote || "").toLowerCase() === "agree");
  return String(agree?.genvm_result?.stderr || agree?.genvm_result?.error || "");
}

function resultNameOf(receipt) {
  return String(receipt?.resultName || receipt?.result_name || ({ 6: "MAJORITY_AGREE" }[receipt?.result] || ""));
}

function executionResultNameOf(receipt) {
  const direct = receipt?.txExecutionResultName || receipt?.tx_execution_result_name;
  if (direct) return String(direct);
  const agreeing = (receipt?.consensus_data?.validators || []).filter(
    (validator) => String(validator?.vote || "").toLowerCase() === "agree",
  );
  if (agreeing.some((validator) => String(validator?.execution_result || "").toUpperCase() === "SUCCESS")) {
    return ExecutionResult.FINISHED_WITH_RETURN;
  }
  if (agreeing.some((validator) => String(validator?.execution_result || "").toUpperCase() === "ERROR")) {
    return ExecutionResult.FINISHED_WITH_ERROR;
  }
  return "";
}

try {
  await client.request({ method: "sim_fundAccount", params: [account.address, 1000] });
  console.log("funded evaluation account", account.address);
} catch (err) {
  console.log("faucet skipped", err?.shortMessage || err?.message || String(err).slice(0, 160));
}

const before = {
  status: await read("get_status_name", [claimId]),
  canEvaluate: await read("can_evaluate", [claimId]),
  finalized: await read("is_finalized", [claimId]),
  verdict: await read("get_claim_verdict", [claimId]),
};
console.log("before", before);
if (!before.canEvaluate) throw new Error("Claim is not evaluable");

const hash = await client.writeContract({
  address,
  functionName: "request_evaluation",
  args: [claimId],
  value: 0n,
});
console.log("evaluation tx", hash);
const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.FINALIZED,
  retries: 180,
  interval: 5000,
});
const statusName = receipt?.statusName || (receipt?.status === 7 ? "FINALIZED" : "");
const execution = executionResultNameOf(receipt);
const consensus = resultNameOf(receipt);
const stderr = stderrFrom(receipt);
console.log("receipt", { statusName, execution, consensus, stderr: stderr.slice(0, 400) });
if (statusName !== TransactionStatus.FINALIZED) throw new Error(`Evaluation did not finalize: ${statusName}`);
if (execution !== ExecutionResult.FINISHED_WITH_RETURN) {
  throw new Error(`Evaluation execution failed: ${execution || "unknown"}`);
}
if (consensus !== "MAJORITY_AGREE") throw new Error(`Evaluation consensus was ${consensus || "unknown"}`);

const after = {
  status: await read("get_status_name", [claimId]),
  finalized: await read("is_finalized", [claimId]),
  verdict: await read("get_claim_verdict", [claimId]),
  evaluation: await read("get_evaluation", [claimId]),
};
if (after.status !== "FINALIZED" || !after.finalized || !after.evaluation?.verdict) {
  throw new Error("Canonical evaluation readback was incomplete");
}

const record = {
  network: "studionet",
  chainId: 61999,
  address,
  claimId,
  hash,
  receiptStatus: receipt?.status ?? null,
  statusName,
  result: receipt?.result ?? null,
  resultName: consensus,
  txExecutionResult: receipt?.txExecutionResult ?? null,
  txExecutionResultName: execution,
  consensusResult: consensus,
  stderr: stderr.slice(0, 800),
  before,
  after,
  at: new Date().toISOString(),
};
const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../docs");
await mkdir(docsDir, { recursive: true });
await writeFile(resolve(docsDir, "evaluation-result.json"), JSON.stringify(record, null, 2));
console.log(JSON.stringify(record, null, 2));
