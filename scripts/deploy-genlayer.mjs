#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

const RPC = process.env.VITE_GENLAYER_RPC || "https://studio.genlayer.com/api";
const VERSION = "BenchProof-v1.0.1";
const PREVIOUS_CONTRACT = "0x0E6A637e78241D5005245281Bc92d7C3aA09e197";
const privateKey = process.env.GENLAYER_DEPLOYER_PRIVATE_KEY?.trim();
if (!privateKey) throw new Error("GENLAYER_DEPLOYER_PRIVATE_KEY is required for deployment");

const code = await readFile(new URL("../contracts/benchproof.py", import.meta.url), "utf8");
const sourceFingerprint = createHash("sha256").update(code).digest("hex");
const account = createAccount(privateKey);
const client = createClient({ chain: studionet, endpoint: RPC, account });

console.log("Deployer", account.address);
console.log("RPC", RPC);

try {
  await client.request({ method: "sim_fundAccount", params: [account.address, 1000] });
  console.log("Faucet ok (1000)");
} catch (err) {
  console.log("Faucet skipped:", err?.shortMessage || err?.message || String(err).slice(0, 200));
}

const schema = await client.getContractSchemaForCode(code);
console.log("Schema methods", Object.keys(schema.methods || {}).length);

const hash = await client.deployContract({ account, code, args: [] });
console.log("Deploy tx", hash);

const waitedReceipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.FINALIZED,
  retries: 120,
  interval: 3000,
});
const settledReceipt = await client.getTransaction({ hash });
const receipt = { ...waitedReceipt, ...settledReceipt };
const statusName = receipt?.statusName || receipt?.status_name || (receipt?.status === 7 ? "FINALIZED" : "");
const result = receipt?.result;
const resultName = receipt?.resultName || receipt?.result_name || ({ 6: "MAJORITY_AGREE" }[result] || "");
console.log("Receipt status", receipt?.status, statusName, "result", result, resultName);
if (statusName !== TransactionStatus.FINALIZED) {
  throw new Error(`Deployment did not finalize: ${statusName || receipt?.status || "unknown"}`);
}
if (resultName !== "MAJORITY_AGREE") {
  throw new Error(`Deployment consensus failed: ${resultName || result || "unknown"}`);
}
const executionResultName = receipt?.txExecutionResultName || receipt?.tx_execution_result_name;
if (executionResultName && executionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
  throw new Error(`Deployment execution failed: ${executionResultName}`);
}
const contractAddress =
  receipt?.contractAddress ||
  receipt?.data?.contract_address ||
  receipt?.consensus_data?.leader_receipt?.contract_address ||
  receipt?.to ||
  "";
console.log("Contract address", contractAddress);

const record = {
  version: VERSION,
  network: "studionet",
  chainId: 61999,
  rpc: RPC,
  deploymentTx: hash,
  contractAddress,
  receiptStatus: receipt?.status ?? statusName ?? null,
  receiptStatusName: statusName || null,
  txExecutionResult: receipt?.txExecutionResult ?? null,
  txExecutionResultName: executionResultName ?? null,
  result: result ?? null,
  resultName: resultName || null,
  deployer: account.address,
  sourceFingerprint,
  previousContract: PREVIOUS_CONTRACT,
  at: new Date().toISOString(),
};
const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../docs");
await mkdir(docsDir, { recursive: true });
await writeFile(resolve(docsDir, "deployment-result.json"), JSON.stringify(record, null, 2));
console.log("Wrote docs/deployment-result.json");
if (!contractAddress) process.exit(1);
