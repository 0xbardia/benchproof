import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLAIM_CORE_FIELDS, canonicalClaimCoreMaterial, hashClaimCore } from "./hash.ts";

describe("claim hash parity", () => {
  it("uses the contract's complete fourteen-field order", () => {
    const input = Object.fromEntries(CLAIM_CORE_FIELDS.map((field, index) => [field, `value-${index}`]));
    const material = canonicalClaimCoreMaterial(input);
    assert.equal(CLAIM_CORE_FIELDS.length, 14);
    assert.deepEqual(material.split("\n"), CLAIM_CORE_FIELDS.map((_, index) => `value-${index}`));
  });

  it("changes when any covered core field changes", () => {
    const input = Object.fromEntries(CLAIM_CORE_FIELDS.map((field) => [field, field]));
    const baseline = hashClaimCore(input);
    for (const field of CLAIM_CORE_FIELDS) {
      const changed = { ...input, [field]: `${field}-changed` };
      assert.notEqual(hashClaimCore(changed), baseline, field);
    }
  });
});
