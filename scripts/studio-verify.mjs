#!/usr/bin/env node
/**
 * Create a fresh, representative claim on the explicitly supplied contract
 * and exercise its non-evaluation lifecycle. This is an operator verification
 * script; it is intentionally separate from the application write path.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

const RPC = process.env.VITE_GENLAYER_RPC || "https://studio.genlayer.com/api";
const address = process.env.VITE_GENLAYER_CONTRACT_ADDRESS?.trim();
const version = process.env.BENCHPROOF_CONTRACT_VERSION || "BenchProof-v1.0.1";
if (!address) throw new Error("VITE_GENLAYER_CONTRACT_ADDRESS is required");

const claimant = createAccount();
const challenger = createAccount();
const client = createClient({ chain: studionet, endpoint: RPC, account: claimant });
const client2 = createClient({ chain: studionet, endpoint: RPC, account: challenger });

async function fund(acct) {
  try {
    await client.request({ method: "sim_fundAccount", params: [acct.address, 1000] });
    console.log("funded", acct.address);
  } catch (err) {
    console.log("faucet skipped", err?.shortMessage || err?.message || String(err).slice(0, 160));
  }
}

function stderrFrom(receipt) {
  const validators = receipt?.consensus_data?.validators || [];
  const agree = validators.find((v) => String(v?.vote || "").toLowerCase() === "agree");
  return String(agree?.genvm_result?.stderr || agree?.genvm_result?.error || "");
}

function resultNameOf(receipt) {
  return String(
    receipt?.resultName ||
      receipt?.result_name ||
      ({ 1: "AGREE", 6: "MAJORITY_AGREE" }[receipt?.result] || ""),
  );
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

function assertSuccessfulReceipt(receipt, method) {
  const statusName = receipt?.statusName || (receipt?.status === 7 ? "FINALIZED" : "");
  const execution = executionResultNameOf(receipt);
  const result = resultNameOf(receipt);
  if (statusName !== TransactionStatus.FINALIZED) {
    throw new Error(`${method} did not finalize: ${statusName || receipt?.status || "unknown"}`);
  }
  if (execution !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(`${method} execution failed: ${execution || "unknown"}`);
  }
  if (!result || !["AGREE", "MAJORITY_AGREE"].includes(result)) {
    throw new Error(`${method} consensus failed: ${result || "unknown"}`);
  }
}

async function write(c, functionName, args) {
  const hash = await c.writeContract({ address, functionName, args, value: 0n });
  const receipt = await c.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    retries: 120,
    interval: 3000,
  });
  assertSuccessfulReceipt(receipt, functionName);
  const stderr = stderrFrom(receipt);
  if (stderr) console.log("GenVM stderr", functionName, stderr.slice(0, 500));
  return {
    hash,
    status: receipt?.status ?? null,
    statusName: receipt?.statusName ?? null,
    result: receipt?.result ?? null,
    resultName: resultNameOf(receipt) || null,
    txExecutionResult: receipt?.txExecutionResult ?? null,
    txExecutionResultName: executionResultNameOf(receipt) || null,
    stderr: stderr.slice(0, 800),
  };
}

async function read(functionName, args = []) {
  return client.readContract({ address, functionName, args });
}

const writes = [];
function record(operation, receipt, readback) {
  writes.push({ operation, ...receipt, readback, verification: "PASS" });
  console.log("PASS", operation, receipt.hash);
}

await fund(claimant);
await fund(challenger);

const versionRead = await read("get_contract_version");
if (versionRead !== version) throw new Error(`Unexpected contract version: ${versionRead}`);
const beforeCount = Number(await read("get_claim_count"));

const created = await write(client, "create_claim", [
  "Matched SWE-bench Verified run",
  "Claude Opus 4.1 scores 72.4% versus GPT-4.1 at 54.6% under the same harness, temperature 0, and one retry.",
  "Claude Opus 4.1",
  "claude-opus-4-1",
  "GPT-4.1",
  "gpt-4.1-2025-04-14",
  "SWE-bench Verified",
  "verified-500-2025-03-15",
  "2026-09-12",
  "resolved %",
  "72.4 vs 54.6",
  "Identical harness and prompts, temperature 0, one retry, matched prompts, failed runs counted as unresolved.",
  "https://www.swebench.com/",
  JSON.stringify({ retriesA: "1", retriesB: "1", promptParity: "matched", sampleSize: "500" }),
]);
const afterCount = Number(await read("get_claim_count"));
if (afterCount !== beforeCount + 1) throw new Error("Claim count did not advance by one");
const claimId = afterCount;
record("create_claim", created, { claimId, count: afterCount });

const evidence = await write(client, "add_evidence", [
  claimId,
  "harness",
  "https://github.com/swe-bench/experiments",
  "sha256:benchproof-live-harness",
  "The same harness configuration was used for both model runs.",
]);
record("add_evidence", evidence, { evidenceCount: await read("get_evidence_count", [claimId]) });

const sourceEvidence = await write(client, "add_evidence", [
  claimId,
  "raw_results",
  "https://www.swebench.com/",
  "sha256:benchproof-live-results",
  "Published benchmark result reference retained for reviewer inspection.",
]);
record("add_evidence[2]", sourceEvidence, { evidenceCount: await read("get_evidence_count", [claimId]) });

const published = await write(client, "publish_claim", [claimId]);
record("publish_claim", published, { status: await read("get_status_name", [claimId]) });

const challenged = await write(client2, "challenge_claim", [
  claimId,
  "reproducibility_problem",
  "Please publish raw trajectories",
  "The headline comparison is useful, but independent review needs the raw trajectories and per-task outcomes.",
  "https://www.swebench.com/",
  "sha256:benchproof-live-challenge",
]);
record("challenge_claim", challenged, {
  status: await read("get_status_name", [claimId]),
  challengeCount: await read("get_challenge_count", [claimId]),
});

const report = {
  network: "studionet",
  chainId: 61999,
  address,
  version,
  claimant: claimant.address,
  challenger: challenger.address,
  claimId,
  beforeCount,
  afterCount,
  writes,
  at: new Date().toISOString(),
};
const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../docs");
await mkdir(docsDir, { recursive: true });
await writeFile(resolve(docsDir, "write-method-matrix.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ address, claimId, writes: writes.length }, null, 2));
