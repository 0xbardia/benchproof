import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canEvaluate, isOperationPending } from "./machine.ts";

describe("durable evaluation state", () => {
  it("keeps every in-flight operation pending across a reload", () => {
    for (const state of ["QUEUED", "SUBMITTED", "CONSENSUS_PENDING", "RECONCILING"] as const) {
      assert.equal(
        isOperationPending({ type: "REQUEST_EVALUATION", state, transactionHash: "0xabc", errorCode: "", updatedAt: "" }),
        true,
        state,
      );
    }
  });

  it("releases the action only for terminal operation states", () => {
    assert.equal(isOperationPending({ type: "REQUEST_EVALUATION", state: "FINALIZED", transactionHash: "0xabc", errorCode: "", updatedAt: "" }), false);
    assert.equal(isOperationPending({ type: "REQUEST_EVALUATION", state: "FAILED", transactionHash: "", errorCode: "RPC_TIMEOUT", updatedAt: "" }), false);
    assert.equal(isOperationPending(null), false);
  });

  it("does not allow a second evaluation after finality", () => {
    assert.equal(canEvaluate("OPEN"), true);
    assert.equal(canEvaluate("CHALLENGED"), true);
    assert.equal(canEvaluate("FINALIZED"), false);
  });
});
