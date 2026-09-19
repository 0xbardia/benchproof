import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertSafeUri, validateCreateClaim, ValidationError } from "./validation.ts";
import { EMPTY_CONDITIONS } from "./types.ts";

describe("SSRF guards", () => {
  it("rejects localhost and metadata hosts", () => {
    assert.throws(() => assertSafeUri("http://127.0.0.1/secret"), ValidationError);
    assert.throws(() => assertSafeUri("http://localhost/admin"), ValidationError);
    assert.throws(() => assertSafeUri("http://169.254.169.254/latest"), ValidationError);
  });
  it("allows https sources", () => {
    assert.doesNotThrow(() => assertSafeUri("https://www.swebench.com/"));
  });
});

describe("create claim validation", () => {
  it("requires core fields and evidence content", () => {
    assert.throws(
      () =>
        validateCreateClaim({
          idempotencyKey: "test-key",
          claimant: "",
          title: "t",
          statement: "s",
          modelA: "a",
          modelAVersion: "1",
          modelB: "b",
          modelBVersion: "1",
          benchmark: "bench",
          benchmarkVersion: "1",
          evaluationDate: "2026-01-01",
          metric: "acc",
          reportedResult: "1",
          methodology: "",
          sourceUrls: [],
          conditions: EMPTY_CONDITIONS,
          evidence: [],
        }),
      ValidationError,
    );
  });
});
