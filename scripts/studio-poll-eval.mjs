#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const RPC = process.env.VITE_GENLAYER_RPC || "https://studio.genlayer.com/api";
const address = process.env.VITE_GENLAYER_CONTRACT_ADDRESS?.trim();
const hash = process.env.TX || process.env.VITE_GENLAYER_EVALUATION_TX;
const claimId = Number(process.env.CLAIM_ID || 1);
if (!address || !hash) throw new Error("VITE_GENLAYER_CONTRACT_ADDRESS and TX (or VITE_GENLAYER_EVALUATION_TX) are required");
const client = createClient({ chain: studionet, endpoint: RPC });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let receipt = null;
for (let i = 0; i < 80; i++) {
  try {
    receipt = await client.getTransaction({ hash });
  } catch (err) {
    console.log("poll error", i, err?.message || err);
    await sleep(5000);
    continue;
  }
  const status = receipt?.status ?? receipt?.statusName;
  console.log("poll", i, "status", status, receipt?.result_name || receipt?.result);
  if (status === 7 || status === "FINALIZED" || status === 8 || String(status).includes("CANCELED") || String(status).includes("TIMEOUT")) {
    break;
  }
  await sleep(5000);
}

let after = {};
try {
  after = {
    status: await client.readContract({ address, functionName: "get_status_name", args: [claimId] }),
    finalized: await client.readContract({ address, functionName: "is_finalized", args: [claimId] }),
    verdict: await client.readContract({ address, functionName: "get_claim_verdict", args: [claimId] }),
    evaluation: await client.readContract({ address, functionName: "get_evaluation", args: [claimId] }),
  };
} catch (err) {
  after = { error: String(err?.message || err) };
}

const record = {
  hash,
  receiptStatus: receipt?.status ?? receipt?.statusName,
  resultName: receipt?.result_name,
  stderr: receipt?.consensus_data?.validators?.find((v) => v.vote === "agree")?.genvm_result?.stderr || "",
  after,
  address,
  claimId,
  at: new Date().toISOString(),
};
const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../docs");
await mkdir(docsDir, { recursive: true });
await writeFile(resolve(docsDir, "evaluation-result.json"), JSON.stringify(record, null, 2));
console.log(JSON.stringify(record, null, 2));
