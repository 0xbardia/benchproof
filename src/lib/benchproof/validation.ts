import { CHALLENGE_CATEGORIES, EVIDENCE_KINDS, LIMITS } from "./constants.ts";
import { EMPTY_CONDITIONS, type Conditions, type CreateClaimInput } from "./types.ts";

export class ValidationError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

function requireText(value: unknown, field: string, max: number, min = 1): string {
  if (typeof value !== "string") throw new ValidationError(`${field} is required`, field);
  const text = value.trim();
  if (text.length < min) throw new ValidationError(`${field} is required`, field);
  if (text.length > max) throw new ValidationError(`${field} exceeds ${max} characters`, field);
  return text;
}

function optionalText(value: unknown, field: string, max: number): string {
  if (value == null || value === "") return "";
  if (typeof value !== "string") throw new ValidationError(`${field} must be text`, field);
  if (value.length > max) throw new ValidationError(`${field} exceeds ${max} characters`, field);
  return value.trim();
}

const SAFE_URI = /^(https?:\/\/|ipfs:\/\/|sha256:|0x)[^\s]+$/i;
const PRIVATE_HOST =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/i;

export function assertSafeUri(uri: string, field = "uri"): void {
  if (!uri) return;
  if (uri.length > LIMITS.uri) throw new ValidationError(`${field} is too long`, field);
  if (!(SAFE_URI.test(uri) || uri.startsWith("sha256:"))) {
    throw new ValidationError(`${field} must be http(s), ipfs, or a hash reference`, field);
  }
  try {
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      const host = new URL(uri).hostname;
      if (PRIVATE_HOST.test(host) || host.endsWith(".internal") || host === "metadata.google.internal") {
        throw new ValidationError(`${field} points at a private or metadata host`, field);
      }
    }
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError(`${field} is not a valid URL`, field);
  }
}

export function parseConditions(raw: unknown): Conditions {
  if (!raw) return { ...EMPTY_CONDITIONS };
  let obj: Record<string, unknown>;
  if (typeof raw === "string") {
    if (!raw.trim()) return { ...EMPTY_CONDITIONS };
    try {
      obj = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new ValidationError("conditions must be valid JSON", "conditions");
    }
  } else if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  } else {
    throw new ValidationError("conditions must be an object", "conditions");
  }
  const parity = (v: unknown): Conditions["promptParity"] => {
    if (v === "matched" || v === "unmatched" || v === "undisclosed") return v;
    return "undisclosed";
  };
  const str = (k: string) => optionalText(obj[k] ?? "", k, 80);
  const conditions = {
    retriesA: str("retriesA") || str("retries_a"),
    retriesB: str("retriesB") || str("retries_b"),
    temperatureA: str("temperatureA") || str("temperature_a"),
    temperatureB: str("temperatureB") || str("temperature_b"),
    maxTokensA: str("maxTokensA") || str("max_tokens_a"),
    maxTokensB: str("maxTokensB") || str("max_tokens_b"),
    toolsA: str("toolsA") || str("tools_a"),
    toolsB: str("toolsB") || str("tools_b"),
    promptParity: parity(obj.promptParity ?? obj.prompt_parity),
    systemPromptParity: parity(obj.systemPromptParity ?? obj.system_prompt_parity),
    sampleSize: str("sampleSize") || str("sample_size"),
    exclusions: optionalText(obj.exclusions ?? "", "exclusions", 240),
  };
  if (JSON.stringify(conditions).length > LIMITS.conditions) {
    throw new ValidationError("conditions exceed length limit", "conditions");
  }
  return conditions;
}

export function conditionsToJson(c: Conditions): string {
  return JSON.stringify(c);
}

export function parseSourceUrls(raw: unknown): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw.map((value, index) => {
        if (typeof value !== "string") {
          throw new ValidationError(`sourceUrls[${index}] must be text`, "sourceUrls");
        }
        return value.trim();
      })
    : String(raw)
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
  if (list.length > 8) throw new ValidationError("at most 8 source URLs", "sourceUrls");
  if (list.join("\n").length > LIMITS.sourceUrls) {
    throw new ValidationError("source URLs exceed length limit", "sourceUrls");
  }
  for (const url of list) assertSafeUri(url, "sourceUrls");
  return list;
}

export function validateCreateClaim(input: CreateClaimInput): CreateClaimInput {
  const idempotencyKey = requireText(input.idempotencyKey, "idempotencyKey", LIMITS.idempotencyKey);
  const claimant = requireText(input.claimant, "claimant", LIMITS.claimant);
  const title = requireText(input.title, "title", LIMITS.title);
  const statement = requireText(input.statement, "statement", LIMITS.statement);
  const modelA = requireText(input.modelA, "modelA", LIMITS.model);
  const modelAVersion = requireText(input.modelAVersion, "modelAVersion", LIMITS.version);
  const modelB = requireText(input.modelB, "modelB", LIMITS.model);
  const modelBVersion = requireText(input.modelBVersion, "modelBVersion", LIMITS.version);
  const benchmark = requireText(input.benchmark, "benchmark", LIMITS.benchmark);
  const benchmarkVersion = requireText(
    input.benchmarkVersion,
    "benchmarkVersion",
    LIMITS.version,
  );
  const evaluationDate = requireText(input.evaluationDate, "evaluationDate", LIMITS.date);
  const metric = requireText(input.metric, "metric", LIMITS.metric);
  const reportedResult = requireText(input.reportedResult, "reportedResult", LIMITS.result);
  const methodology = optionalText(input.methodology, "methodology", LIMITS.methodology);
  const sourceUrls = parseSourceUrls(input.sourceUrls);
  const conditions = parseConditions(input.conditions);
  if (!Array.isArray(input.evidence)) {
    throw new ValidationError("evidence must be an array", "evidence");
  }
  if (input.evidence.length > LIMITS.evidence) {
    throw new ValidationError(`at most ${LIMITS.evidence} evidence items`, "evidence");
  }
  const evidence = input.evidence.map((ev, i) => {
    const kind = requireText(ev.kind, `evidence[${i}].kind`, 40);
    if (!(EVIDENCE_KINDS as readonly string[]).includes(kind)) {
      throw new ValidationError(`unknown evidence kind: ${kind}`, `evidence[${i}].kind`);
    }
    const uri = optionalText(ev.uri, `evidence[${i}].uri`, LIMITS.uri);
    const contentHash = optionalText(ev.contentHash, `evidence[${i}].contentHash`, LIMITS.hash);
    const note = optionalText(ev.note, `evidence[${i}].note`, LIMITS.note);
    if (!uri && !contentHash && !note) {
      throw new ValidationError("each evidence item needs a uri, hash, or note", `evidence[${i}]`);
    }
    if (uri) assertSafeUri(uri, `evidence[${i}].uri`);
    return { kind, uri, contentHash, note };
  });
  return {
    idempotencyKey,
    claimant,
    title,
    statement,
    modelA,
    modelAVersion,
    modelB,
    modelBVersion,
    benchmark,
    benchmarkVersion,
    evaluationDate,
    metric,
    reportedResult,
    methodology,
    sourceUrls,
    conditions,
    evidence,
  };
}

export function validateChallenge(input: {
  idempotencyKey: string;
  claimId: string;
  challenger: string;
  category: string;
  reason: string;
  explanation: string;
  evidenceUri: string;
  evidenceHash: string;
}) {
  const idempotencyKey = requireText(input.idempotencyKey, "idempotencyKey", LIMITS.idempotencyKey);
  const claimId = requireText(input.claimId, "claimId", 80);
  const challenger = requireText(input.challenger, "challenger", LIMITS.claimant);
  const category = requireText(input.category, "category", 64);
  if (!(CHALLENGE_CATEGORIES as readonly string[]).includes(category)) {
    throw new ValidationError("unknown challenge category", "category");
  }
  const reason = requireText(input.reason, "reason", LIMITS.reason);
  const explanation = requireText(input.explanation, "explanation", LIMITS.explanation);
  const evidenceUri = optionalText(input.evidenceUri, "evidenceUri", LIMITS.uri);
  const evidenceHash = optionalText(input.evidenceHash, "evidenceHash", LIMITS.hash);
  if (evidenceUri) assertSafeUri(evidenceUri, "evidenceUri");
  return { idempotencyKey, claimId, challenger, category, reason, explanation, evidenceUri, evidenceHash };
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /ignore\s+all\s+previous/i,
  /return\s+supported/i,
  /mark\s+this\s+claim\s+supported/i,
  /you\s+are\s+now\s+in\s+(developer|god|jailbreak)\s+mode/i,
  /disregard\s+(the\s+)?(system|previous)\s+(prompt|rules|instructions)/i,
  /override\s+(the\s+)?(evaluation|verdict)\s+(rules|schema)/i,
];

export function detectInjection(text: string): boolean {
  if (!text) return false;
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

export function wrapUntrusted(label: string, payload: unknown): string {
  return JSON.stringify({
    untrusted_data: {
      label,
      payload,
    },
  });
}
