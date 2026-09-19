#!/usr/bin/env node
/** Verify every public view on the current deployment, including invalid IDs. */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const RPC = process.env.VITE_GENLAYER_RPC || "https://studio.genlayer.com/api";
const address = process.env.VITE_GENLAYER_CONTRACT_ADDRESS?.trim();
const expectedVersion = process.env.BENCHPROOF_CONTRACT_VERSION || "BenchProof-v1.0.1";
const claimId = Number(process.env.CLAIM_ID || 1);
if (!address) throw new Error("VITE_GENLAYER_CONTRACT_ADDRESS is required");
if (!Number.isInteger(claimId) || claimId < 1) throw new Error("CLAIM_ID must be a positive integer");

const client = createClient({ chain: studionet, endpoint: RPC });
const rows = [];
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function read(functionName, args = []) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const value = await client.readContract({ address, functionName, args });
      await sleep(1200);
      return value;
    } catch (err) {
      const message = String(err?.message || err);
      if (/rate limit/i.test(message) && attempt < 5) {
        const wait = 10_000 * (attempt + 1);
        console.log("rate-limited, waiting", wait, "ms");
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`read failed: ${functionName}`);
}

function record(method, inputs, expected, actual, pass) {
  const safeActual = typeof actual === "string" ? actual.slice(0, 800) : actual;
  rows.push({ method, inputs, expected, actual: safeActual, result: pass ? "PASS" : "FAIL" });
  console.log(pass ? "PASS" : "FAIL", method, JSON.stringify(inputs));
}

async function checked(method, args, expected, predicate) {
  try {
    const actual = await read(method, args);
    record(method, args, expected, actual, predicate(actual));
    return actual;
  } catch (err) {
    record(method, args, expected, String(err?.message || err), false);
    return undefined;
  }
}

async function invalid(method, args) {
  try {
    const actual = await read(method, args);
    record(`${method} invalid`, args, "safe failure", actual, false);
  } catch {
    record(`${method} invalid`, args, "safe failure", "threw", true);
  }
}

const count = await checked("get_claim_count", [], "integer >= 1", (v) => Number.isInteger(Number(v)) && Number(v) >= 1);
await checked("get_contract_version", [], expectedVersion, (v) => v === expectedVersion);
await checked("get_deployer", [], "0x address", (v) => /^0x[0-9a-f]{40}$/i.test(String(v)));
await checked("get_limits", [], "all bounded limits", (v) => Number(v?.max_title) === 200 && Number(v?.max_evidence) === 12);
await checked("get_challenge_categories", [], "finite category list", (v) => Array.isArray(v) && v.includes("reproducibility_problem"));
await checked("get_verdict_types", [], "five verdicts", (v) => Array.isArray(v) && v.length === 5 && v.includes("INVALID"));

const claim = await checked("get_claim", [claimId], "claim object", (v) => Boolean(v?.title && v?.claimant));
const status = await checked("get_claim_status", [claimId], "FINALIZED status code", (v) => Number(v) === 4);
await checked("get_status_name", [claimId], "FINALIZED", (v) => v === "FINALIZED");
await checked("get_claim_verdict", [claimId], "one supported verdict", (v) => ["SUPPORTED", "PARTIALLY_SUPPORTED", "INSUFFICIENT_EVIDENCE", "MISLEADING", "INVALID"].includes(v));
await checked("get_claimant", [claimId], "0x address", (v) => /^0x[0-9a-f]{40}$/i.test(String(v)));
const evidenceCount = Number(await checked("get_evidence_count", [claimId], ">= 1", (v) => Number(v) >= 1));
if (evidenceCount > 0) {
  await checked("get_claim_evidence", [claimId, 0], "evidence object", (v) => Boolean(v?.kind && (v?.uri || v?.content_hash || v?.note)));
}
const challengeCount = Number(await checked("get_challenge_count", [claimId], ">= 1", (v) => Number(v) >= 1));
if (challengeCount > 0) {
  await checked("get_challenge", [claimId, 0], "challenge object", (v) => Boolean(v?.category && v?.reason));
}
await checked("get_evaluation", [claimId], "present evaluation", (v) => Boolean(v?.present && v?.verdict && v?.summary));
await checked("is_finalized", [claimId], "true", (v) => v === true);
await checked("can_challenge", [claimId], "false after finality", (v) => v === false);
await checked("can_add_evidence", [claimId], "false after publication", (v) => v === false);
await checked("can_evaluate", [claimId], "false after finality", (v) => v === false);
await checked("get_claim_core_hash_material", [claimId], "canonical material", (v) => typeof v === "string" && v.split("\n").length === 14);

const invalidMethods = [
  "get_claim",
  "get_claim_status",
  "get_status_name",
  "get_claim_verdict",
  "get_claimant",
  "get_evidence_count",
  "get_challenge_count",
  "get_evaluation",
  "is_finalized",
  "can_challenge",
  "can_add_evidence",
  "can_evaluate",
  "get_claim_core_hash_material",
];
for (const method of invalidMethods) await invalid(method, [999999]);
await invalid("get_claim_evidence", [999999, 0]);
await invalid("get_challenge", [999999, 0]);
if (claim && evidenceCount > 0) await invalid("get_claim_evidence", [claimId, 999999]);
if (claim && challengeCount > 0) await invalid("get_challenge", [claimId, 999999]);

const failed = rows.filter((row) => row.result === "FAIL");
const report = {
  network: "studionet",
  chainId: 61999,
  address,
  claimId,
  count,
  status,
  matrix: rows,
  passed: rows.length - failed.length,
  failed: failed.length,
  at: new Date().toISOString(),
};
const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../docs");
await mkdir(docsDir, { recursive: true });
await writeFile(resolve(docsDir, "read-method-matrix.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ address, claimId, passed: report.passed, failed: report.failed }, null, 2));
process.exit(failed.length ? 1 : 0);
