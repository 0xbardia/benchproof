import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SEED_CLAIMS } from "./seed.ts";

describe("worked examples", () => {
  it("never present local rubric results as canonical finality", () => {
    assert.ok(SEED_CLAIMS.length > 0);
    for (const claim of SEED_CLAIMS) {
      assert.equal(claim.registry, "seed");
      assert.notEqual(claim.status, "FINALIZED");
      assert.equal(claim.evaluation?.source, "seed");
      assert.notEqual(claim.txState, "finalized");
    }
  });
});
