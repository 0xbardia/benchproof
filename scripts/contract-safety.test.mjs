import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(resolve(root, "contracts/benchproof.py"), "utf8");

test("contract evaluator parser has a strict fail-closed boundary", () => {
  for (const field of [
    "verdict",
    "confidence",
    "summary",
    "key_findings",
    "material_issues",
    "limitations",
    "evidence_references",
  ]) {
    assert.match(source, new RegExp(`\\"${field}\\"`));
  }
  assert.match(source, /len\(data\.keys\(\)\) != len\(required\)/);
  assert.match(source, /not isinstance\(value, list\)/);
  assert.match(source, /verdict == "SUPPORTED"/);
  assert.match(source, /return self\._fail_safe_eval\(text\)/);
  assert.match(source, /json\.dumps\(\{"untrusted_data": body\}\)/);
  assert.doesNotMatch(source, /default missing reasoning to SUPPORTED/i);
});

test("contract schema rejects the incomplete supported response class", () => {
  const incomplete = '{"verdict":"SUPPORTED"}';
  assert.match(source, /if len\(data\.keys\(\)\) != len\(required\)/);
  assert.match(source, /if verdict == "SUPPORTED" and \(len\(key_findings_values\) == 0 or len\(evidence_reference_values\) == 0\)/);
  assert.equal(JSON.parse(incomplete).verdict, "SUPPORTED");
});
