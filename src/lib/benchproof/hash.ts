import { createHash } from "node:crypto";

export function sha256Hex(input: string | Buffer): string {
  return "sha256:" + createHash("sha256").update(input).digest("hex");
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) out[key] = sortValue(obj[key]);
    return out;
  }
  return value;
}

export function hashEvidence(input: {
  kind: string;
  uri: string;
  note: string;
  extra?: unknown;
}): string {
  return sha256Hex(
    canonicalJson({
      kind: input.kind,
      uri: input.uri,
      note: input.note,
      extra: input.extra ?? null,
    }),
  );
}

export const CLAIM_CORE_FIELDS = [
  "title",
  "statement",
  "model_a",
  "model_a_version",
  "model_b",
  "model_b_version",
  "benchmark",
  "benchmark_version",
  "evaluation_date",
  "metric",
  "reported_result",
  "methodology",
  "source_urls",
  "conditions_json",
] as const;

/** Exact newline-joined material used by BenchProof.get_claim_core_hash_material. */
export function canonicalClaimCoreMaterial(input: Record<string, unknown>): string {
  return CLAIM_CORE_FIELDS.map((field) => {
    const value = input[field];
    return value == null ? "" : String(value);
  }).join("\n");
}

export function hashClaimCore(input: Record<string, unknown>): string {
  return sha256Hex(canonicalClaimCoreMaterial(input));
}
