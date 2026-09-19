import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { validateChallenge, validateCreateClaim, ValidationError, assertSafeUri } from "./validation.ts";
import { canEvaluate, canPublish } from "./machine.ts";
import { forensicEvaluate, parseVerdictJson, EVAL_SYSTEM_PROMPT, buildLlmUserPrompt, claimToEvalInput } from "./evaluate.ts";
import { DEPLOYMENT, getPublicNetwork } from "./deployment.ts";
import { LIMITS, VERDICTS } from "./constants.ts";
import type {
  ChallengeInput,
  ClaimRecord,
  ClaimSummary,
  ClaimTransaction,
  ClaimOperation,
  CreateClaimInput,
  DurableOperationState,
  EvaluationRecord,
} from "./types.ts";
import type { ClaimStatus, VerdictType } from "./constants.ts";
import { EMPTY_CONDITIONS } from "./types.ts";
import { assertMutationAccess } from "./security.server.ts";

type ClaimRow = {
  id: string;
  onchain_id: number | null;
  claimant: string;
  title: string;
  statement: string;
  model_a: string;
  model_a_version: string;
  model_b: string;
  model_b_version: string;
  benchmark: string;
  benchmark_version: string;
  evaluation_date: string;
  metric: string;
  reported_result: string;
  methodology: string;
  source_urls: string;
  conditions_json: string;
  status: string;
  created_at: string;
  published_at: string | null;
  tx_hash: string;
  tx_state: string;
  registry: string;
  scenario: string;
  core_hash: string;
};

type EvidenceRow = {
  id: string;
  claim_id: string;
  kind: string;
  uri: string;
  content_hash: string;
  note: string;
  added_at: string;
  onchain_index: number | null;
};

type ChallengeRow = {
  id: string;
  claim_id: string;
  challenger: string;
  category: string;
  reason: string;
  explanation: string;
  evidence_uri: string;
  evidence_hash: string;
  created_at: string;
  onchain_index: number | null;
};

type EvalRow = {
  claim_id: string;
  present: boolean;
  verdict: string;
  confidence: string;
  summary: string;
  key_findings: string;
  material_issues: string;
  limitations: string;
  evidence_references: string;
  evaluated_at: string;
  evaluator_version: string;
  source: string;
};

type TransactionRow = {
  id: string;
  claim_id: string;
  method: string;
  hash: string;
  status: string;
  detail: string;
  created_at: string;
};

type OperationRow = {
  idempotency_key: string;
  kind: string;
  fingerprint: string;
  status: "pending" | "completed" | "failed";
  result_json: string;
  error_code: string;
  claim_id: string | null;
  operation_type: string;
  state: DurableOperationState;
  tx_hash: string;
  submitted_at: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
};

const MAX_LIST = 100;

function parseList(raw: string): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  } catch {
    // Contract strings such as source_urls use newline-separated values.
  }
  return raw.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean);
}

function parseConditionsJson(raw: string) {
  try {
    return { ...EMPTY_CONDITIONS, ...(JSON.parse(raw) as object) };
  } catch {
    return { ...EMPTY_CONDITIONS };
  }
}

function asTime(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function hashing() {
  return import("./hash.ts");
}

function mapEval(row: EvalRow | undefined): EvaluationRecord | null {
  if (!row) return null;
  return {
    present: Boolean(row.present),
    verdict: (row.verdict as VerdictType) || "",
    confidence: (row.confidence as EvaluationRecord["confidence"]) || "",
    summary: row.summary,
    keyFindings: parseList(row.key_findings),
    materialIssues: parseList(row.material_issues),
    limitations: parseList(row.limitations),
    evidenceReferences: parseList(row.evidence_references),
    evaluatedAt: asTime(row.evaluated_at),
    evaluatorVersion: row.evaluator_version,
    source: (row.source as EvaluationRecord["source"]) || "",
  };
}

function mapTransaction(row: TransactionRow): ClaimTransaction {
  return {
    id: row.id,
    claimId: row.claim_id,
    method: row.method,
    hash: row.hash,
    status: row.status,
    detail: row.detail,
    createdAt: asTime(row.created_at),
  };
}

function mapOperation(row: OperationRow): ClaimOperation {
  return {
    type: row.operation_type || row.kind,
    state: row.state,
    transactionHash: row.tx_hash || "",
    errorCode: row.error_code || "",
    updatedAt: asTime(row.updated_at),
  };
}

function mapClaim(
  row: ClaimRow,
  evidence: EvidenceRow[],
  challenges: ChallengeRow[],
  evaluation: EvalRow | undefined,
  transactions: TransactionRow[],
  evaluationOperation: OperationRow | undefined,
): ClaimRecord {
  return {
    id: row.id,
    onchainId: row.onchain_id,
    claimant: row.claimant,
    title: row.title,
    statement: row.statement,
    modelA: row.model_a,
    modelAVersion: row.model_a_version,
    modelB: row.model_b,
    modelBVersion: row.model_b_version,
    benchmark: row.benchmark,
    benchmarkVersion: row.benchmark_version,
    evaluationDate: row.evaluation_date,
    metric: row.metric,
    reportedResult: row.reported_result,
    methodology: row.methodology,
    sourceUrls: parseList(row.source_urls),
    conditions: parseConditionsJson(row.conditions_json),
    status: row.status as ClaimStatus,
    createdAt: asTime(row.created_at),
    publishedAt: asTime(row.published_at),
    evidence: evidence.map((item) => ({
      id: item.id,
      claimId: item.claim_id,
      kind: item.kind,
      uri: item.uri,
      contentHash: item.content_hash,
      note: item.note,
      addedAt: asTime(item.added_at),
      onchainIndex: item.onchain_index,
    })),
    challenges: challenges.map((item) => ({
      id: item.id,
      claimId: item.claim_id,
      challenger: item.challenger,
      category: item.category,
      reason: item.reason,
      explanation: item.explanation,
      evidenceUri: item.evidence_uri,
      evidenceHash: item.evidence_hash,
      createdAt: asTime(item.created_at),
      onchainIndex: item.onchain_index,
    })),
    evaluation: mapEval(evaluation),
    transactions: transactions.map(mapTransaction),
    txHash: row.tx_hash,
    txState: (row.tx_state as ClaimRecord["txState"]) || "",
    registry: row.registry as ClaimRecord["registry"],
    scenario: row.scenario,
    evaluationOperation: evaluationOperation ? mapOperation(evaluationOperation) : null,
  };
}

async function ensureSeeded() {
  const sql = await getSql();
  const existing = await sql<{ c: number }>`select count(*)::int as c from claims`;
  if ((existing[0]?.c ?? 0) > 0) return;
  const { SEED_CLAIMS } = await import("./seed.ts");
  for (const claim of SEED_CLAIMS) await insertFullClaim(claim);
  await sql`
    insert into app_meta (key, value) values ('seeded', 'true')
    on conflict (key) do nothing
  `;
}

let initializationPromise: Promise<void> | null = null;

/** Called by the server bootstrap, not by ordinary GET render paths. */
export function initializeBenchproof(): Promise<void> {
  initializationPromise ??= ensureSeeded()
    .then(() => reconcileExistingClaims())
    .then(() => requestOnchainSync().catch((error) => {
      console.error("[benchproof] initial on-chain sync failed", error instanceof Error ? error.message : "unknown error");
    }));
  return initializationPromise;
}

async function ensureReadReady() {
  if (initializationPromise) {
    await initializationPromise;
  } else if (process.env.NODE_ENV !== "production") {
    await initializeBenchproof();
  }
}

async function resolveClaimId(sql: Sql, id: string): Promise<string> {
  let current = id;
  for (let i = 0; i < 8; i++) {
    const rows = await sql<{ canonical_id: string }>`
      select canonical_id from claim_aliases where alias_id = ${current} limit 1
    `;
    const next = rows[0]?.canonical_id;
    if (!next || next === current) return current;
    current = next;
  }
  throw new Error("Claim alias chain is too deep");
}

async function mergeClaimAlias(sql: Sql, aliasId: string, canonicalId: string) {
  if (aliasId === canonicalId) return;
  const existing = await sql<{ canonical_id: string }>`
    select canonical_id from claim_aliases where alias_id = ${aliasId} limit 1
  `;
  if (existing[0]?.canonical_id && existing[0].canonical_id !== canonicalId) return;

  const alias = (await sql<ClaimRow>`select * from claims where id = ${aliasId} limit 1`)[0];
  if (!alias) return;
  let canonical = (await sql<ClaimRow>`select * from claims where id = ${canonicalId} limit 1`)[0];
  if (!canonical) {
    await sql`
      insert into claims (
        id, onchain_id, claimant, title, statement, model_a, model_a_version,
        model_b, model_b_version, benchmark, benchmark_version, evaluation_date,
        metric, reported_result, methodology, source_urls, conditions_json, status,
        created_at, published_at, tx_hash, tx_state, registry, scenario, core_hash
      )
      select ${canonicalId}, onchain_id, claimant, title, statement, model_a, model_a_version,
        model_b, model_b_version, benchmark, benchmark_version, evaluation_date,
        metric, reported_result, methodology, source_urls, conditions_json, status,
        created_at, published_at, tx_hash, tx_state, 'onchain', scenario, core_hash
      from claims where id = ${aliasId}
      on conflict (id) do nothing
    `;
    canonical = (await sql<ClaimRow>`select * from claims where id = ${canonicalId} limit 1`)[0];
  }
  if (!canonical) throw new Error(`Could not create canonical claim ${canonicalId}`);

  const transactionRows = await sql<TransactionRow & { updated_at: string }>`
    select id, claim_id, method, hash, status, detail, created_at, updated_at
    from transactions where claim_id = ${aliasId} order by created_at asc
  `;
  for (const transaction of transactionRows) {
    const canonicalTransactionId = `${canonicalId}:${transaction.hash || transaction.id}`;
    await sql`
      insert into transactions (id, claim_id, method, hash, status, detail, created_at, updated_at)
      values (${canonicalTransactionId}, ${canonicalId}, ${transaction.method}, ${transaction.hash},
        ${transaction.status}, ${transaction.detail}, ${transaction.created_at}, ${transaction.updated_at})
      on conflict (id) do update set
        status = case when transactions.status = 'FINALIZED' then transactions.status else excluded.status end,
        detail = case when transactions.detail = '' then excluded.detail else transactions.detail end,
        updated_at = excluded.updated_at
    `;
    await sql`delete from transactions where id = ${transaction.id}`;
  }

  const evidenceRows = await sql<EvidenceRow>`
    select * from evidence where claim_id = ${aliasId} order by added_at asc
  `;
  for (const evidence of evidenceRows) {
    const duplicate = await sql<{ id: string }>`
      select id from evidence
      where claim_id = ${canonicalId} and kind = ${evidence.kind} and uri = ${evidence.uri}
        and content_hash = ${evidence.content_hash} and note = ${evidence.note}
      limit 1
    `;
    if (!duplicate[0]) {
      await sql`
        insert into evidence (id, claim_id, kind, uri, content_hash, note, added_at, onchain_index)
        values (${`${canonicalId}:legacy:${evidence.id}`}, ${canonicalId}, ${evidence.kind}, ${evidence.uri},
          ${evidence.content_hash}, ${evidence.note}, ${evidence.added_at}, ${evidence.onchain_index})
        on conflict (id) do nothing
      `;
    }
    await sql`delete from evidence where id = ${evidence.id}`;
  }
  // Chain reads below replace legacy mirror rows with deterministic on-chain
  // IDs. Keep one canonical row per chain item after a local-to-chain merge.
  await sql`delete from evidence where claim_id = ${canonicalId} and id like ${`${canonicalId}:legacy:%`}`;

  const challengeRows = await sql<ChallengeRow>`
    select * from challenges where claim_id = ${aliasId} order by created_at asc
  `;
  for (const challenge of challengeRows) {
    const duplicate = await sql<{ id: string }>`
      select id from challenges
      where claim_id = ${canonicalId} and challenger = ${challenge.challenger}
        and category = ${challenge.category} and reason = ${challenge.reason}
      limit 1
    `;
    if (!duplicate[0]) {
      await sql`
        insert into challenges (
          id, claim_id, challenger, category, reason, explanation, evidence_uri, evidence_hash,
          created_at, onchain_index
        ) values (
          ${`${canonicalId}:legacy:${challenge.id}`}, ${canonicalId}, ${challenge.challenger}, ${challenge.category},
          ${challenge.reason}, ${challenge.explanation}, ${challenge.evidence_uri}, ${challenge.evidence_hash},
          ${challenge.created_at}, ${challenge.onchain_index}
        ) on conflict (id) do nothing
      `;
    }
    await sql`delete from challenges where id = ${challenge.id}`;
  }
  await sql`delete from challenges where claim_id = ${canonicalId} and id like ${`${canonicalId}:legacy:%`}`;

  const aliasEvaluation = (await sql<EvalRow>`select * from evaluations where claim_id = ${aliasId} limit 1`)[0];
  if (aliasEvaluation) {
    const canonicalEvaluation = (await sql<EvalRow>`select * from evaluations where claim_id = ${canonicalId} limit 1`)[0];
    if (!canonicalEvaluation) {
      await sql`
        insert into evaluations (
          claim_id, present, verdict, confidence, summary, key_findings, material_issues,
          limitations, evidence_references, evaluated_at, evaluator_version, source
        ) values (
          ${canonicalId}, ${aliasEvaluation.present}, ${aliasEvaluation.verdict}, ${aliasEvaluation.confidence},
          ${aliasEvaluation.summary}, ${aliasEvaluation.key_findings}, ${aliasEvaluation.material_issues},
          ${aliasEvaluation.limitations}, ${aliasEvaluation.evidence_references}, ${aliasEvaluation.evaluated_at},
          ${aliasEvaluation.evaluator_version}, ${aliasEvaluation.source}
        ) on conflict (claim_id) do nothing
      `;
    }
    await sql`delete from evaluations where claim_id = ${aliasId}`;
  }

  await sql`
    update operations
    set claim_id = ${canonicalId}, updated_at = now()
    where claim_id = ${aliasId}
       or idempotency_key in (${`record:${aliasId}`}, ${`evaluation:${aliasId}`})
       or (result_json::jsonb ->> 'id') = ${aliasId}
       or (result_json::jsonb ->> 'id') in (
         select id from challenges where claim_id = ${canonicalId}
       )
  `;
  const oldEvaluationKey = `evaluation:${aliasId}`;
  const newEvaluationKey = `evaluation:${canonicalId}`;
  const canonicalOperation = await sql<{ idempotency_key: string }>`
    select idempotency_key from operations where idempotency_key = ${newEvaluationKey} limit 1
  `;
  if (!canonicalOperation[0]) {
    await sql`
      update operations
      set idempotency_key = ${newEvaluationKey}, claim_id = ${canonicalId}, updated_at = now()
      where idempotency_key = ${oldEvaluationKey}
    `;
  } else {
    await sql`update operations set claim_id = ${canonicalId}, updated_at = now() where idempotency_key = ${oldEvaluationKey}`;
  }
  await sql`
    update operations
    set claim_id = ${canonicalId}, operation_type = 'REQUEST_EVALUATION', updated_at = now()
    where idempotency_key = ${newEvaluationKey}
  `;

  await sql`
    update claims canonical
    set tx_hash = case when canonical.tx_hash = '' then ${alias.tx_hash} else canonical.tx_hash end,
        published_at = coalesce(canonical.published_at, ${alias.published_at}),
        status = ${canonical.status}, tx_state = ${canonical.tx_state}
    where canonical.id = ${canonicalId}
  `;
  await sql`
    update claims stale
    set registry = 'index', status = ${canonical.status}, tx_state = ${canonical.tx_state}
    where stale.id = ${aliasId}
  `;
  await sql`
    insert into claim_aliases (alias_id, canonical_id)
    values (${aliasId}, ${canonicalId})
    on conflict (alias_id) do update set canonical_id = excluded.canonical_id
  `;
}

async function canonicalizeClaimIdentity(sql: Sql, onchainId: number, coreHash: string): Promise<string> {
  const canonicalId = `onchain-${onchainId}`;
  const candidates = await sql<{ id: string }>`
    select id from claims
    where id <> ${canonicalId} and registry <> 'seed'
      and (onchain_id = ${onchainId} or (${coreHash} <> '' and core_hash = ${coreHash}))
    order by case when id = ${canonicalId} then 0 else 1 end, created_at asc
  `;
  const canonical = (await sql<{ id: string }>`select id from claims where id = ${canonicalId} limit 1`)[0];
  if (!canonical && candidates[0]) {
    await mergeClaimAlias(sql, candidates[0].id, canonicalId);
  }
  for (const candidate of candidates) await mergeClaimAlias(sql, candidate.id, canonicalId);
  return canonicalId;
}

async function reconcileExistingClaims() {
  const sql = await getSql();
  const canonicalRows = await sql<{ onchain_id: number; core_hash: string }>`
    select onchain_id, core_hash from claims where registry = 'onchain' and onchain_id is not null
  `;
  for (const row of canonicalRows) {
    await canonicalizeClaimIdentity(sql, Number(row.onchain_id), row.core_hash || "");
  }
}

async function insertFullClaim(claim: ClaimRecord) {
  const sql = await getSql();
  const { hashClaimCore } = await hashing();
  const coreHash = hashClaimCore({
    title: claim.title,
    statement: claim.statement,
    model_a: claim.modelA,
    model_a_version: claim.modelAVersion,
    model_b: claim.modelB,
    model_b_version: claim.modelBVersion,
    benchmark: claim.benchmark,
    benchmark_version: claim.benchmarkVersion,
    evaluation_date: claim.evaluationDate,
    metric: claim.metric,
    reported_result: claim.reportedResult,
    methodology: claim.methodology,
    source_urls: claim.sourceUrls.join("\n"),
    conditions_json: JSON.stringify(claim.conditions),
  });
  await sql`
    insert into claims (
      id, onchain_id, claimant, title, statement, model_a, model_a_version,
      model_b, model_b_version, benchmark, benchmark_version, evaluation_date,
      metric, reported_result, methodology, source_urls, conditions_json, status,
      created_at, published_at, tx_hash, tx_state, registry, scenario, core_hash
    ) values (
      ${claim.id}, ${claim.onchainId}, ${claim.claimant}, ${claim.title}, ${claim.statement},
      ${claim.modelA}, ${claim.modelAVersion}, ${claim.modelB}, ${claim.modelBVersion},
      ${claim.benchmark}, ${claim.benchmarkVersion}, ${claim.evaluationDate},
      ${claim.metric}, ${claim.reportedResult}, ${claim.methodology},
      ${JSON.stringify(claim.sourceUrls)}, ${JSON.stringify(claim.conditions)},
      ${claim.status}, ${claim.createdAt}, ${claim.publishedAt || null},
      ${claim.txHash}, ${claim.txState}, ${claim.registry}, ${claim.scenario || ""}, ${coreHash}
    )
    on conflict (id) do nothing
  `;
  for (const item of claim.evidence) {
    await sql`
      insert into evidence (id, claim_id, kind, uri, content_hash, note, added_at, onchain_index)
      values (${item.id}, ${item.claimId}, ${item.kind}, ${item.uri}, ${item.contentHash}, ${item.note}, ${item.addedAt}, ${item.onchainIndex})
      on conflict (id) do nothing
    `;
  }
  for (const item of claim.challenges) {
    await sql`
      insert into challenges (id, claim_id, challenger, category, reason, explanation, evidence_uri, evidence_hash, created_at, onchain_index)
      values (${item.id}, ${item.claimId}, ${item.challenger}, ${item.category}, ${item.reason}, ${item.explanation}, ${item.evidenceUri}, ${item.evidenceHash}, ${item.createdAt}, ${item.onchainIndex})
      on conflict (id) do nothing
    `;
  }
  if (claim.evaluation?.present) {
    const evaluation = claim.evaluation;
    await sql`
      insert into evaluations (
        claim_id, present, verdict, confidence, summary, key_findings, material_issues,
        limitations, evidence_references, evaluated_at, evaluator_version, source
      ) values (
        ${claim.id}, ${true}, ${evaluation.verdict}, ${evaluation.confidence}, ${evaluation.summary},
        ${JSON.stringify(evaluation.keyFindings)}, ${JSON.stringify(evaluation.materialIssues)},
        ${JSON.stringify(evaluation.limitations)}, ${JSON.stringify(evaluation.evidenceReferences)},
        ${evaluation.evaluatedAt}, ${evaluation.evaluatorVersion}, ${evaluation.source}
      )
      on conflict (claim_id) do nothing
    `;
  }
}

async function loadClaim(id: string): Promise<ClaimRecord | null> {
  const sql = await getSql();
  const resolvedId = /^\d+$/.test(id) ? id : await resolveClaimId(sql, id);
  let rows = await sql<ClaimRow>`select * from claims where id = ${resolvedId} limit 1`;
  if (!rows[0] && /^\d+$/.test(id)) {
    rows = await sql<ClaimRow>`select * from claims where onchain_id = ${Number(id)} limit 1`;
  }
  const row = rows[0];
  if (!row) return null;
  const evidence = await sql<EvidenceRow>`select * from evidence where claim_id = ${row.id} order by added_at asc`;
  const challenges = await sql<ChallengeRow>`select * from challenges where claim_id = ${row.id} order by created_at asc`;
  const evaluations = await sql<EvalRow>`select * from evaluations where claim_id = ${row.id} limit 1`;
  const transactions = await sql<TransactionRow>`
    select id, claim_id, method, hash, status, detail, created_at
    from transactions where claim_id = ${row.id} order by created_at asc
  `;
  const evaluationOperations = await sql<OperationRow>`
    select * from operations
    where kind = 'genlayer_evaluation'
      and (claim_id = ${row.id} or idempotency_key = ${`evaluation:${row.id}`})
    order by created_at desc limit 1
  `;
  return mapClaim(row, evidence, challenges, evaluations[0], transactions, evaluationOperations[0]);
}

function asJsonList(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.filter((item): item is string => typeof item === "string"));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return JSON.stringify(parsed.filter((item): item is string => typeof item === "string"));
    } catch {
      // Keep malformed canonical data out of the mirror.
    }
  }
  return "[]";
}

async function upsertOnchainBundle(
  onchainId: number,
  bundle: {
    claim: Record<string, unknown>;
    evidence: Record<string, unknown>[];
    challenges: Record<string, unknown>[];
    evaluation: Record<string, unknown>;
  },
) {
  const sql = await getSql();
  const raw = bundle.claim;
  const gl = await import("./genlayer.server.ts");
  const sourceUrls = String(raw.source_urls ?? "");
  const conditions = String(raw.conditions_json ?? "{}");
  const { hashClaimCore } = await hashing();
  const coreHash = hashClaimCore({
    title: String(raw.title ?? ""),
    statement: String(raw.statement ?? ""),
    model_a: String(raw.model_a ?? ""),
    model_a_version: String(raw.model_a_version ?? ""),
    model_b: String(raw.model_b ?? ""),
    model_b_version: String(raw.model_b_version ?? ""),
    benchmark: String(raw.benchmark ?? ""),
    benchmark_version: String(raw.benchmark_version ?? ""),
    evaluation_date: String(raw.evaluation_date ?? ""),
    metric: String(raw.metric ?? ""),
    reported_result: String(raw.reported_result ?? ""),
    methodology: String(raw.methodology ?? ""),
    source_urls: sourceUrls,
    conditions_json: conditions,
  });
  const id = await canonicalizeClaimIdentity(sql, onchainId, coreHash);
  const chainStatus = gl.statusFromInt(raw.status);
  const pendingEvaluation = await sql<{ idempotency_key: string }>`
    select idempotency_key from operations
    where kind = 'genlayer_evaluation' and status = 'pending'
      and (claim_id = ${id} or idempotency_key = ${`evaluation:${id}`})
    limit 1
  `;
  const status = pendingEvaluation[0] && chainStatus !== "FINALIZED" ? "EVALUATING" : chainStatus;
  const txState = status === "FINALIZED" ? "finalized" : status === "EVALUATING" ? "consensus_pending" : "submitted";
  await sql`
    insert into claims (
      id, onchain_id, claimant, title, statement, model_a, model_a_version,
      model_b, model_b_version, benchmark, benchmark_version, evaluation_date,
      metric, reported_result, methodology, source_urls, conditions_json, status,
      created_at, published_at, tx_hash, tx_state, registry, scenario, core_hash
    ) values (
      ${id}, ${onchainId}, ${String(raw.claimant ?? "")}, ${String(raw.title ?? "")},
      ${String(raw.statement ?? "")}, ${String(raw.model_a ?? "")}, ${String(raw.model_a_version ?? "")},
      ${String(raw.model_b ?? "")}, ${String(raw.model_b_version ?? "")}, ${String(raw.benchmark ?? "")},
      ${String(raw.benchmark_version ?? "")}, ${String(raw.evaluation_date ?? "")},
      ${String(raw.metric ?? "")}, ${String(raw.reported_result ?? "")}, ${String(raw.methodology ?? "")},
      ${sourceUrls}, ${conditions}, ${status}, ${String(raw.created_at || new Date().toISOString())},
      ${String(raw.published_at || "") || null}, ${""}, ${txState}, ${"onchain"}, ${""}, ${coreHash}
    )
    on conflict (id) do update set
      onchain_id = excluded.onchain_id,
      claimant = excluded.claimant,
      title = excluded.title,
      statement = excluded.statement,
      model_a = excluded.model_a,
      model_a_version = excluded.model_a_version,
      model_b = excluded.model_b,
      model_b_version = excluded.model_b_version,
      benchmark = excluded.benchmark,
      benchmark_version = excluded.benchmark_version,
      evaluation_date = excluded.evaluation_date,
      metric = excluded.metric,
      reported_result = excluded.reported_result,
      methodology = excluded.methodology,
      source_urls = excluded.source_urls,
      conditions_json = excluded.conditions_json,
      status = excluded.status,
      published_at = excluded.published_at,
      tx_state = excluded.tx_state,
      registry = excluded.registry,
      core_hash = excluded.core_hash
  `;
  for (let i = 0; i < bundle.evidence.length; i++) {
    const item = bundle.evidence[i];
    await sql`
      insert into evidence (id, claim_id, kind, uri, content_hash, note, added_at, onchain_index)
      values (${`${id}-ev-${i}`}, ${id}, ${String(item.kind ?? "note")}, ${String(item.uri ?? "")},
        ${String(item.content_hash ?? "")}, ${String(item.note ?? "")}, ${String(item.added_at || new Date().toISOString())}, ${i})
      on conflict (id) do update set
        kind = excluded.kind, uri = excluded.uri, content_hash = excluded.content_hash,
        note = excluded.note, added_at = excluded.added_at, onchain_index = excluded.onchain_index
    `;
  }
  await sql`delete from evidence where claim_id = ${id} and onchain_index >= ${bundle.evidence.length}`;
  for (let i = 0; i < bundle.challenges.length; i++) {
    const item = bundle.challenges[i];
    await sql`
      insert into challenges (id, claim_id, challenger, category, reason, explanation, evidence_uri, evidence_hash, created_at, onchain_index)
      values (${`${id}-ch-${i}`}, ${id}, ${String(item.challenger ?? "")}, ${String(item.category ?? "other")},
        ${String(item.reason ?? "")}, ${String(item.explanation ?? "")}, ${String(item.evidence_uri ?? "")},
        ${String(item.evidence_hash ?? "")}, ${String(item.created_at || new Date().toISOString())}, ${i})
      on conflict (id) do update set
        challenger = excluded.challenger, category = excluded.category, reason = excluded.reason,
        explanation = excluded.explanation, evidence_uri = excluded.evidence_uri,
        evidence_hash = excluded.evidence_hash, created_at = excluded.created_at,
        onchain_index = excluded.onchain_index
    `;
  }
  await sql`delete from challenges where claim_id = ${id} and onchain_index >= ${bundle.challenges.length}`;
  const evaluation = bundle.evaluation;
  const hasEvaluation = evaluation && (evaluation.present === true || evaluation.present === "true");
  if (hasEvaluation) {
    const verdict = String(evaluation.verdict ?? "");
    const confidence = String(evaluation.confidence ?? "");
    if (!(VERDICTS as readonly string[]).includes(verdict) || !["high", "medium", "low"].includes(confidence)) {
      throw new Error("Invalid canonical evaluation returned by contract");
    }
    if (chainStatus === "FINALIZED") {
      await sql`
        update operations set
          status = ${"completed"}, state = ${"FINALIZED"}, error_code = ${""},
          result_json = case when result_json = '{}' then ${JSON.stringify({ evaluation })} else result_json end,
          finalized_at = coalesce(finalized_at, now()), updated_at = now()
        where kind = 'genlayer_evaluation' and status = 'pending'
          and (claim_id = ${id} or idempotency_key = ${`evaluation:${id}`})
      `;
      await sql`
        update transactions set status = ${"FINALIZED"}, detail = ${JSON.stringify({ state: "FINALIZED", source: "canonical readback" })}, updated_at = now()
        where claim_id = ${id} and method = 'request_evaluation'
      `;
    }
    await sql`
      insert into evaluations (
        claim_id, present, verdict, confidence, summary, key_findings, material_issues,
        limitations, evidence_references, evaluated_at, evaluator_version, source
      ) values (
        ${id}, ${true}, ${verdict}, ${confidence}, ${String(evaluation.summary ?? "")},
        ${asJsonList(evaluation.key_findings)}, ${asJsonList(evaluation.material_issues)},
        ${asJsonList(evaluation.limitations)}, ${asJsonList(evaluation.evidence_references)},
        ${String(evaluation.evaluated_at || new Date().toISOString())}, ${String(evaluation.evaluator_version || "")}, ${"genlayer"}
      )
      on conflict (claim_id) do update set
        present = excluded.present, verdict = excluded.verdict, confidence = excluded.confidence,
        summary = excluded.summary, key_findings = excluded.key_findings, material_issues = excluded.material_issues,
        limitations = excluded.limitations, evidence_references = excluded.evidence_references,
        evaluated_at = excluded.evaluated_at, evaluator_version = excluded.evaluator_version, source = excluded.source
    `;
  } else {
    await sql`delete from evaluations where claim_id = ${id}`;
  }
  if (onchainId === DEPLOYMENT.evaluationClaimId) {
    for (const transaction of DEPLOYMENT.proofTransactions) {
      await sql`
        insert into transactions (id, claim_id, method, hash, status, detail)
        values (${`${id}:${transaction.hash}`}, ${id}, ${transaction.method}, ${transaction.hash}, ${"FINALIZED"}, ${JSON.stringify({ source: "verified deployment record" })})
        on conflict (id) do update set status = excluded.status, detail = excluded.detail, updated_at = now()
      `;
    }
  }
  return id;
}

let syncInFlight: Promise<void> | null = null;
let syncFailureCount = 0;
let syncRetryAt = 0;

export function requestOnchainSync(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  if (Date.now() < syncRetryAt) return Promise.resolve();
  syncInFlight = (async () => {
    let sql: Sql | null = null;
    let runId = "";
    let warning: ReturnType<typeof setTimeout> | undefined;
    try {
      sql = await getSql();
      const syncKey = `onchain_sync_at:${getPublicNetwork().contractAddress}`;
      const meta = await sql<{ value: string }>`select value from app_meta where key = ${syncKey}`;
      const last = Number(meta[0]?.value || 0);
      if (last && Date.now() - last < 60_000) {
        syncRetryAt = Date.now() + 60_000;
        return;
      }
      runId = crypto.randomUUID();
      await sql`insert into sync_runs (id, status) values (${runId}, ${"running"})`;
      warning = setTimeout(() => console.warn("[benchproof] on-chain sync is still running", { runId }), 8_000);
      const gl = await import("./genlayer.server.ts");
      if (gl.hasActiveWrite()) {
        await sql`update sync_runs set status = ${"completed"}, error_code = ${"DEFERRED_FOR_WRITE"}, finished_at = now() where id = ${runId}`;
        syncRetryAt = Date.now() + 15_000;
        return;
      }
      if (!gl.genlayerConfigured()) {
        await sql`update sync_runs set status = ${"failed"}, error_code = ${"NOT_CONFIGURED"}, finished_at = now() where id = ${runId}`;
        syncFailureCount += 1;
        syncRetryAt = Date.now() + Math.min(15 * 60_000, 15_000 * 2 ** Math.min(syncFailureCount - 1, 5));
        return;
      }
      const count = await gl.fetchOnchainCount();
      for (let i = 1; i <= count; i++) await upsertOnchainBundle(i, await gl.fetchOnchainBundle(i));
      await sql`
        insert into app_meta (key, value) values (${syncKey}, ${String(Date.now())})
        on conflict (key) do update set value = excluded.value
      `;
      await sql`update sync_runs set status = ${"completed"}, finished_at = now() where id = ${runId}`;
      syncFailureCount = 0;
      syncRetryAt = Date.now() + 60_000;
    } catch (error) {
      syncFailureCount = Math.min(syncFailureCount + 1, 6);
      syncRetryAt = Date.now() + Math.min(15 * 60_000, 15_000 * 2 ** (syncFailureCount - 1));
      console.error("[benchproof] on-chain sync failed", {
        runId: runId || undefined,
        retryInMs: syncRetryAt - Date.now(),
        error: error instanceof Error ? error.message : "unknown error",
      });
      if (sql && runId) {
        try {
          await sql`update sync_runs set status = ${"failed"}, error_code = ${"SYNC_FAILED"}, finished_at = now() where id = ${runId}`;
        } catch (updateError) {
          console.error("[benchproof] could not record sync failure", updateError instanceof Error ? updateError.message : "unknown error");
        }
      }
    } finally {
      if (warning) clearTimeout(warning);
    }
  })().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function beginOperation(
  sql: Sql,
  idempotencyKey: string,
  kind: string,
  fingerprint: string,
  context: { claimId?: string; operationType?: string } = {},
): Promise<{ state: "started" } | { state: "completed"; result: Record<string, unknown> } | { state: "pending" }> {
  const inserted = await sql<OperationRow>`
    insert into operations (
      idempotency_key, kind, fingerprint, status, claim_id, operation_type, state
    ) values (
      ${idempotencyKey}, ${kind}, ${fingerprint}, ${"pending"}, ${context.claimId || null},
      ${context.operationType || kind}, ${"QUEUED"}
    )
    on conflict (idempotency_key) do nothing returning *
  `;
  if (inserted[0]) return { state: "started" };
  const existing = (await sql<OperationRow>`select * from operations where idempotency_key = ${idempotencyKey} limit 1`)[0];
  if (!existing) throw new Error("Idempotency record could not be read");
  if (existing.fingerprint !== fingerprint || existing.kind !== kind) {
    throw new ValidationError("Idempotency key is already used for another operation.");
  }
  await sql`
    update operations set
      claim_id = coalesce(claim_id, ${context.claimId || null}),
      operation_type = case when operation_type = '' then ${context.operationType || kind} else operation_type end,
      updated_at = now()
    where idempotency_key = ${idempotencyKey}
  `;
  if (existing.status === "completed") {
    try {
      return { state: "completed", result: JSON.parse(existing.result_json) as Record<string, unknown> };
    } catch {
      throw new Error("Stored operation result is invalid");
    }
  }
  if (existing.status === "pending") {
    // A browser-disconnected record request used to leave a pre-chain draft
    // pending forever. Only expire that narrow, hashless state; chain writes
    // with a known hash remain pending until canonical sync resolves them.
    const staleRecord =
      kind === "record_claim" &&
      !existing.tx_hash &&
      existing.updated_at &&
      Date.parse(existing.updated_at) < Date.now() - 10 * 60_000;
    if (!staleRecord) return { state: "pending" };
    await sql`
      update operations
      set status = 'failed', state = 'FAILED', error_code = 'CLIENT_DISCONNECTED', updated_at = now()
      where idempotency_key = ${idempotencyKey} and status = 'pending'
        and tx_hash = '' and updated_at < now() - interval '10 minutes'
    `;
    existing.status = "failed";
  }
  const reclaimed = await sql<OperationRow>`
    update operations set
      status = ${"pending"}, error_code = ${""}, state = ${"QUEUED"}, tx_hash = ${""},
      submitted_at = null, finalized_at = null, updated_at = now()
    where idempotency_key = ${idempotencyKey} and fingerprint = ${fingerprint}
      and status = 'failed' and updated_at < now() - interval '10 minutes'
    returning *
  `;
  return reclaimed[0] ? { state: "started" } : { state: "pending" };
}

async function updateOperationState(
  sql: Sql,
  key: string,
  state: DurableOperationState,
  transactionHash = "",
) {
  await sql`
    update operations set
      state = ${state},
      tx_hash = case when ${transactionHash} <> '' then ${transactionHash} else tx_hash end,
      submitted_at = case when ${transactionHash} <> '' then coalesce(submitted_at, now()) else submitted_at end,
      updated_at = now()
    where idempotency_key = ${key}
  `;
}

async function bindOperation(sql: Sql, key: string, claimId: string, operationType: string) {
  await sql`
    update operations
    set claim_id = ${claimId}, operation_type = ${operationType}, updated_at = now()
    where idempotency_key = ${key}
  `;
}

async function finishOperation(sql: Sql, key: string, result: Record<string, unknown>) {
  const transactionHash = typeof result.txHash === "string" ? result.txHash : "";
  await sql`
    update operations set
      status = ${"completed"}, state = ${"FINALIZED"}, result_json = ${JSON.stringify(result)},
      tx_hash = case when ${transactionHash} <> '' then ${transactionHash} else tx_hash end,
      error_code = ${""}, finalized_at = now(), updated_at = now()
    where idempotency_key = ${key}
  `;
}

async function failOperation(sql: Sql, key: string, errorCode: string) {
  await sql`
    update operations set status = ${"failed"}, state = ${"FAILED"}, error_code = ${errorCode}, updated_at = now()
    where idempotency_key = ${key}
  `;
}

function safeError(error: unknown, fallback: string): string {
  console.error("[benchproof] mutation failed", error instanceof Error ? error.message : "unknown error");
  if (error instanceof ValidationError) return error.message;
  return fallback;
}

async function recordTransactions(
  sql: Sql,
  claimId: string,
  receipts: Array<{ method?: string; hash: string; resultName?: string; executionResultName?: string; statusName?: string }>,
  methods: string[],
) {
  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i];
    await sql`
      insert into transactions (id, claim_id, method, hash, status, detail)
      values (${`${claimId}:${receipt.hash}`}, ${claimId}, ${receipt.method || methods[i] || "contract_write"}, ${receipt.hash},
        ${"FINALIZED"}, ${JSON.stringify({ result: receipt.resultName || "", execution: receipt.executionResultName || "" })})
      on conflict (id) do update set status = excluded.status, detail = excluded.detail, updated_at = now()
    `;
  }
}

async function recordPendingTransaction(
  sql: Sql,
  claimId: string,
  method: string,
  hash: string,
  status = "CONSENSUS_PENDING",
) {
  if (!hash) return;
  await sql`
    insert into transactions (id, claim_id, method, hash, status, detail)
    values (${`${claimId}:${hash}`}, ${claimId}, ${method}, ${hash}, ${status}, ${JSON.stringify({ state: status })})
    on conflict (id) do update set
      status = case when transactions.status = 'FINALIZED' then transactions.status else excluded.status end,
      updated_at = now()
  `;
}

function recordClaimInput(claim: ClaimRecord) {
  return {
    title: claim.title,
    statement: claim.statement,
    modelA: claim.modelA,
    modelAVersion: claim.modelAVersion,
    modelB: claim.modelB,
    modelBVersion: claim.modelBVersion,
    benchmark: claim.benchmark,
    benchmarkVersion: claim.benchmarkVersion,
    evaluationDate: claim.evaluationDate,
    metric: claim.metric,
    reportedResult: claim.reportedResult,
    methodology: claim.methodology,
    sourceUrls: claim.sourceUrls.join("\n"),
    conditionsJson: JSON.stringify(claim.conditions),
    evidence: claim.evidence.map((item) => ({
      kind: item.kind,
      uri: item.uri,
      contentHash: item.contentHash,
      note: item.note,
    })),
  };
}

async function runRecordClaimOnchain(claim: ClaimRecord, sql: Sql, key: string): Promise<void> {
  try {
    const gl = await import("./genlayer.server.ts");
    const submitted = await gl.submitClaimLifecycle(recordClaimInput(claim), async (method, hash) => {
      await updateOperationState(sql, key, "SUBMITTED", hash);
      await recordPendingTransaction(sql, claim.id, method, hash, "SUBMITTED");
      await sql`update claims set tx_state = ${"submitted"} where id = ${claim.id}`;
    });
    await recordTransactions(sql, claim.id, submitted.receipts, ["create_claim", ...claim.evidence.map(() => "add_evidence"), "publish_claim"]);
    await sql`
      update claims set onchain_id = ${submitted.onchainId}, registry = ${"onchain"},
        tx_hash = ${submitted.hashes[0] || ""}, tx_state = ${"finalized"}, claimant = ${submitted.claimant}
      where id = ${claim.id}
    `;
    await upsertOnchainBundle(submitted.onchainId, await gl.fetchOnchainBundle(submitted.onchainId));
    await updateOperationState(sql, key, "RECONCILING", submitted.hashes.at(-1) || "");
    await finishOperation(sql, key, { onchainId: submitted.onchainId, hashes: submitted.hashes });
  } catch (error) {
    try {
      await failOperation(sql, key, "RECORD_FAILED");
      await sql`update claims set tx_state = ${"failed"} where id = ${claim.id}`;
    } catch (persistError) {
      console.error("[benchproof] could not persist record failure", persistError instanceof Error ? persistError.message : "unknown error");
    }
    safeError(error, "GenLayer claim recording failed.");
  }
}

async function runEvaluationOnchain(claim: ClaimRecord, sql: Sql, key: string): Promise<void> {
  let submittedHash = "";
  try {
    const gl = await import("./genlayer.server.ts");
    const receipt = await gl.requestEvaluationOnchain(claim.onchainId as number, async (hash) => {
      submittedHash = hash;
      await updateOperationState(sql, key, "CONSENSUS_PENDING", hash);
      await recordPendingTransaction(sql, claim.id, "request_evaluation", hash);
      await sql`update claims set status = ${"EVALUATING"}, tx_state = ${"consensus_pending"} where id = ${claim.id}`;
    });
    await recordTransactions(sql, claim.id, [receipt], ["request_evaluation"]);
    await updateOperationState(sql, key, "RECONCILING", receipt.hash);
    await upsertOnchainBundle(claim.onchainId as number, await gl.fetchOnchainBundle(claim.onchainId as number));
    const updated = await loadClaim(claim.id);
    if (!updated || updated.status !== "FINALIZED" || updated.evaluation?.source !== "genlayer" || !updated.evaluation.verdict) {
      throw new Error("Canonical evaluation readback was incomplete");
    }
    await finishOperation(sql, key, { evaluation: updated.evaluation, txHash: receipt.hash });
  } catch (error) {
    if (submittedHash) {
      try {
        await updateOperationState(sql, key, "CONSENSUS_PENDING", submittedHash);
        await recordPendingTransaction(sql, claim.id, "request_evaluation", submittedHash);
        await sql`update claims set status = ${"EVALUATING"}, tx_state = ${"consensus_pending"} where id = ${claim.id}`;
      } catch (persistError) {
        console.error("[benchproof] could not preserve pending evaluation", persistError instanceof Error ? persistError.message : "unknown error");
      }
      console.warn("[benchproof] evaluation receipt polling deferred", { transactionHash: submittedHash });
      return;
    }
    try {
      await failOperation(sql, key, "EVALUATION_FAILED");
      await sql`update claims set tx_state = ${"failed"}, status = ${claim.status} where id = ${claim.id}`;
    } catch (persistError) {
      console.error("[benchproof] could not persist evaluation failure", persistError instanceof Error ? persistError.message : "unknown error");
    }
    safeError(error, "GenLayer did not finalize an evaluation.");
  }
}

export const listClaims = createServerFn({ method: "GET" }).handler(async () => {
  await ensureReadReady();
  const sql = await getSql();
  const rows = await sql<ClaimRow>`
    select * from claims
    where not exists (
      select 1 from claim_aliases alias_row where alias_row.alias_id = claims.id
    )
    order by case when registry = 'onchain' then 0 else 1 end, created_at desc
    limit ${MAX_LIST}
  `;
  const evals = await sql<EvalRow>`
    select evaluations.* from evaluations
    where not exists (
      select 1 from claim_aliases alias_row where alias_row.alias_id = evaluations.claim_id
    )
  `;
  const evCounts = await sql<{ claim_id: string; c: number }>`
    select evidence.claim_id, count(*)::int as c from evidence
    where not exists (
      select 1 from claim_aliases alias_row where alias_row.alias_id = evidence.claim_id
    )
    group by evidence.claim_id
  `;
  const chCounts = await sql<{ claim_id: string; c: number }>`
    select challenges.claim_id, count(*)::int as c from challenges
    where not exists (
      select 1 from claim_aliases alias_row where alias_row.alias_id = challenges.claim_id
    )
    group by challenges.claim_id
  `;
  const evMap = Object.fromEntries(evals.map((item) => [item.claim_id, item]));
  const evidenceMap = Object.fromEntries(evCounts.map((item) => [item.claim_id, item.c]));
  const challengeMap = Object.fromEntries(chCounts.map((item) => [item.claim_id, item.c]));
  const items: ClaimSummary[] = rows.map((row) => ({
    id: row.id,
    onchainId: row.onchain_id,
    title: row.title,
    statement: row.statement,
    claimant: row.claimant,
    modelA: row.model_a,
    modelB: row.model_b,
    benchmark: row.benchmark,
    metric: row.metric,
    reportedResult: row.reported_result,
    status: row.status as ClaimStatus,
    createdAt: asTime(row.created_at),
    registry: row.registry as ClaimSummary["registry"],
    evidenceCount: evidenceMap[row.id] ?? 0,
    challengeCount: challengeMap[row.id] ?? 0,
    verdict: (evMap[row.id]?.verdict as VerdictType) || "",
  }));
  return { items, network: getPublicNetwork(), limit: MAX_LIST };
});

export const getClaim = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureReadReady();
    const claim = await loadClaim(typeof data?.id === "string" ? data.id.slice(0, 80) : "");
    return { claim, canonicalId: claim?.id || null, network: getPublicNetwork() };
  });

export const getNetworkInfo = createServerFn({ method: "GET" }).handler(async () => getPublicNetwork());

export const hashEvidenceFn = createServerFn({ method: "POST" })
  .validator((input: { kind: string; uri: string; note: string }) => input)
  .handler(async ({ data }) => {
    assertMutationAccess("evidence_hash");
    if (!data || typeof data.kind !== "string" || typeof data.uri !== "string" || typeof data.note !== "string") {
      throw new ValidationError("Evidence input is invalid.");
    }
    if (data.kind.length > 40 || data.uri.length > LIMITS.uri || data.note.length > LIMITS.note) {
      throw new ValidationError("Evidence input is too large.");
    }
    assertSafeUri(data.uri, "uri");
    return { hash: (await hashing()).hashEvidence({ kind: data.kind, uri: data.uri, note: data.note }) };
  });

export const createClaim = createServerFn({ method: "POST" })
  .validator((input: CreateClaimInput) => input)
  .handler(async ({ data }) => {
    assertMutationAccess("create_claim");
    let parsed: CreateClaimInput;
    try {
      parsed = validateCreateClaim(data);
    } catch (error) {
      return { ok: false as const, error: error instanceof ValidationError ? error.message : "Invalid claim." };
    }
    if (parsed.evidence.length < 1) return { ok: false as const, error: "Attach at least one evidence item before filing." };
    const sql = await getSql();
    const fingerprint = (await hashing()).canonicalJson(parsed);
    const operation = await beginOperation(sql, parsed.idempotencyKey, "create_claim", fingerprint);
    if (operation.state === "completed") return { ok: true as const, id: String(operation.result.id) };
    if (operation.state === "pending") return { ok: false as const, pending: true, error: "This claim submission is already in progress." };
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { hashEvidence } = await hashing();
    const evidence = parsed.evidence.map((item, index) => ({
      id: crypto.randomUUID(),
      claimId: id,
      kind: item.kind,
      uri: item.uri,
      contentHash: item.contentHash || hashEvidence(item),
      note: item.note,
      addedAt: now,
      onchainIndex: index,
    }));
    const record: ClaimRecord = {
      id,
      onchainId: null,
      claimant: parsed.claimant,
      title: parsed.title,
      statement: parsed.statement,
      modelA: parsed.modelA,
      modelAVersion: parsed.modelAVersion,
      modelB: parsed.modelB,
      modelBVersion: parsed.modelBVersion,
      benchmark: parsed.benchmark,
      benchmarkVersion: parsed.benchmarkVersion,
      evaluationDate: parsed.evaluationDate,
      metric: parsed.metric,
      reportedResult: parsed.reportedResult,
      methodology: parsed.methodology,
      sourceUrls: parsed.sourceUrls,
      conditions: parsed.conditions,
      status: "DRAFT",
      createdAt: now,
      publishedAt: "",
      evidence,
      challenges: [],
      evaluation: null,
      transactions: [],
      txHash: "",
      txState: "",
      registry: "index",
    };
    try {
      if (!canPublish("DRAFT", parsed.claimant, parsed.claimant, evidence.length)) throw new ValidationError("Cannot file this claim.");
      await insertFullClaim(record);
      await bindOperation(sql, parsed.idempotencyKey, id, "CREATE_CLAIM");
      await finishOperation(sql, parsed.idempotencyKey, { id });
      return { ok: true as const, id };
    } catch (error) {
      await failOperation(sql, parsed.idempotencyKey, "CREATE_FAILED");
      return { ok: false as const, error: safeError(error, "Could not file claim.") };
    }
  });

export const recordClaimOnchain = createServerFn({ method: "POST" })
  .validator((input: { claimId: string }) => input)
  .handler(async ({ data }) => {
    assertMutationAccess("create_claim");
    await ensureReadReady();
    const claim = await loadClaim(data.claimId.slice(0, 80));
    if (!claim) return { ok: false as const, error: "Claim not found." };
    if (claim.onchainId != null) return { ok: true as const, onchainId: claim.onchainId, hashes: claim.transactions.map((item) => item.hash) };
    const gl = await import("./genlayer.server.ts");
    if (!gl.genlayerConfigured()) return { ok: false as const, error: "GenLayer contract is not configured." };
    const sql = await getSql();
    const key = `record:${claim.id}`;
    const fingerprint = (await hashing()).canonicalJson({
      title: claim.title,
      statement: claim.statement,
      modelA: claim.modelA,
      modelB: claim.modelB,
      benchmark: claim.benchmark,
      evidence: claim.evidence.map((item) => [item.kind, item.uri, item.contentHash, item.note]),
    });
    const operation = await beginOperation(sql, key, "record_claim", fingerprint, {
      claimId: claim.id,
      operationType: "CREATE_CLAIM",
    });
    if (operation.state === "completed") return { ok: true as const, onchainId: Number(operation.result.onchainId), hashes: Array.isArray(operation.result.hashes) ? operation.result.hashes.map(String) : [] };
    if (operation.state === "pending") return { ok: false as const, pending: true, error: "Claim recording is already in progress." };
    await sql`update claims set tx_state = ${"preparing"} where id = ${claim.id}`;
    await updateOperationState(sql, key, "SUBMITTED");
    // Keep the chain lifecycle independent of the browser response. A user
    // refresh must not abort the durable operation or turn the request into a
    // framework-level 500 after the operation has been accepted.
    void runRecordClaimOnchain(claim, sql, key).catch((error) => {
      console.error("[benchproof] detached record operation failed", error instanceof Error ? error.message : "unknown error");
    });
    return { ok: false as const, pending: true, error: "Claim recording is continuing in the background." };
  });

export const challengeClaim = createServerFn({ method: "POST" })
  .validator((input: ChallengeInput) => input)
  .handler(async ({ data }) => {
    assertMutationAccess("challenge");
    await ensureReadReady();
    let parsed: ReturnType<typeof validateChallenge>;
    try {
      parsed = validateChallenge(data);
    } catch (error) {
      return { ok: false as const, error: error instanceof ValidationError ? error.message : "Invalid challenge." };
    }
    const claim = await loadClaim(parsed.claimId);
    if (!claim) return { ok: false as const, error: "Claim not found." };
    if (claim.onchainId == null) return { ok: false as const, error: "Only a claim confirmed on GenLayer can be challenged." };
    if (!["OPEN", "CHALLENGED"].includes(claim.status) || claim.challenges.length >= LIMITS.challenges) {
      return { ok: false as const, error: "This claim cannot be challenged in its current state." };
    }
    const sql = await getSql();
    const key = parsed.idempotencyKey;
    const fingerprint = (await hashing()).canonicalJson(parsed);
    const operation = await beginOperation(sql, key, "challenge", fingerprint, {
      claimId: claim.id,
      operationType: "CHALLENGE",
    });
    if (operation.state === "completed") return { ok: true as const, id: String(operation.result.id) };
    if (operation.state === "pending") return { ok: false as const, pending: true, error: "Challenge filing is already in progress." };
    try {
      const gl = await import("./genlayer.server.ts");
      if (!gl.genlayerConfigured()) throw new Error("contract not configured");
      const receipt = await gl.submitChallengeOnchain({
        claimId: claim.onchainId,
        category: parsed.category,
        reason: parsed.reason,
        explanation: parsed.explanation,
        evidenceUri: parsed.evidenceUri,
        evidenceHash: parsed.evidenceHash,
      });
      await updateOperationState(sql, key, "SUBMITTED", receipt.hash);
      await recordTransactions(sql, claim.id, [receipt], ["challenge_claim"]);
      await upsertOnchainBundle(claim.onchainId, await gl.fetchOnchainBundle(claim.onchainId));
      const updated = await loadClaim(claim.id);
      const item = updated?.challenges.at(-1);
      const id = item?.id || `${claim.id}-ch-${claim.challenges.length}`;
      await finishOperation(sql, key, { id });
      return { ok: true as const, id };
    } catch (error) {
      await failOperation(sql, key, "CHALLENGE_FAILED");
      return { ok: false as const, error: safeError(error, "GenLayer did not confirm this challenge.") };
    }
  });

export const requestEvaluation = createServerFn({ method: "POST" })
  .validator((input: { claimId: string; mode?: "preview" | "llm" | "genlayer" }) => input)
  .handler(async ({ data }) => {
    const requestedMode = data?.mode;
    assertMutationAccess(requestedMode === "llm" || requestedMode === "genlayer" ? "evaluation" : "preview");
    if (!data || typeof data.claimId !== "string" || data.claimId.trim().length === 0 || data.claimId.length > 80) {
      return { ok: false as const, error: "Invalid claim." };
    }
    if (requestedMode && !["preview", "llm", "genlayer"].includes(requestedMode)) {
      return { ok: false as const, error: "Invalid evaluation mode." };
    }
    await ensureReadReady();
    const claim = await loadClaim(data.claimId.slice(0, 80));
    if (!claim) return { ok: false as const, error: "Claim not found." };
    const mode = data.mode || "preview";
    if (mode === "genlayer") {
      if (claim.onchainId == null) return { ok: false as const, error: "Submit this claim to GenLayer before requesting a consensus verdict." };
      const gl = await import("./genlayer.server.ts");
      if (!gl.genlayerConfigured()) return { ok: false as const, error: "GenLayer contract is not configured." };
      const sql = await getSql();
      const key = `evaluation:${claim.id}`;
      const operation = await beginOperation(sql, key, "genlayer_evaluation", String(claim.onchainId), {
        claimId: claim.id,
        operationType: "REQUEST_EVALUATION",
      });
      if (operation.state === "completed") {
        const completed = await loadClaim(claim.id);
        return { ok: true as const, evaluation: completed?.evaluation || null, txHash: String(operation.result.txHash || "") };
      }
      if (operation.state === "pending") return { ok: false as const, pending: true, error: "GenLayer evaluation is already in progress." };
      if (claim.status === "FINALIZED" && claim.evaluation?.source === "genlayer") return { ok: false as const, error: "A GenLayer verdict is already finalized." };
      if (!canEvaluate(claim.status)) return { ok: false as const, error: "Evaluation is not allowed in this state." };
      await sql`update claims set status = ${"EVALUATING"}, tx_state = ${"consensus_pending"} where id = ${claim.id}`;
      await updateOperationState(sql, key, "CONSENSUS_PENDING");
      void runEvaluationOnchain(claim, sql, key).catch((error) => {
        console.error("[benchproof] detached evaluation operation failed", error instanceof Error ? error.message : "unknown error");
      });
      return { ok: false as const, pending: true, error: "GenLayer evaluation is continuing in the background." };
    }

    if (claim.onchainId != null || claim.status === "FINALIZED" || !["OPEN", "CHALLENGED"].includes(claim.status)) {
      return { ok: false as const, error: "Only an open off-chain case can receive a local preview." };
    }
    const sql = await getSql();
    const key = `preview:${claim.id}:${mode}`;
    const operation = await beginOperation(sql, key, "preview_evaluation", mode);
    if (operation.state === "completed") {
      const completed = await loadClaim(claim.id);
      return { ok: true as const, evaluation: completed?.evaluation || null };
    }
    if (operation.state === "pending") return { ok: false as const, pending: true, error: "Preview evaluation is already in progress." };
    let evaluation = forensicEvaluate(claimToEvalInput(claim));
    if (mode === "llm") {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        await failOperation(sql, key, "LLM_UNAVAILABLE");
        return { ok: false as const, error: "Live model evaluation is not available in this environment." };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "grok-4.5",
            max_tokens: 900,
            messages: [
              { role: "system", content: EVAL_SYSTEM_PROMPT },
              { role: "user", content: buildLlmUserPrompt(claimToEvalInput(claim)) },
            ],
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("external evaluator unavailable");
        const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        evaluation = parseVerdictJson(body.choices?.[0]?.message?.content || "");
      } catch (error) {
        await failOperation(sql, key, "LLM_FAILED");
        return { ok: false as const, error: error instanceof DOMException && error.name === "AbortError" ? "Preview evaluator timed out." : "Preview evaluator failed." };
      } finally {
        clearTimeout(timeout);
      }
    }
    evaluation.source = "preview";
    await sql`
      insert into evaluations (
        claim_id, present, verdict, confidence, summary, key_findings, material_issues,
        limitations, evidence_references, evaluated_at, evaluator_version, source
      ) values (
        ${claim.id}, ${true}, ${evaluation.verdict}, ${evaluation.confidence}, ${evaluation.summary},
        ${JSON.stringify(evaluation.keyFindings)}, ${JSON.stringify(evaluation.materialIssues)},
        ${JSON.stringify(evaluation.limitations)}, ${JSON.stringify(evaluation.evidenceReferences)},
        ${evaluation.evaluatedAt}, ${evaluation.evaluatorVersion}, ${"preview"}
      )
      on conflict (claim_id) do update set
        present = excluded.present, verdict = excluded.verdict, confidence = excluded.confidence,
        summary = excluded.summary, key_findings = excluded.key_findings, material_issues = excluded.material_issues,
        limitations = excluded.limitations, evidence_references = excluded.evidence_references,
        evaluated_at = excluded.evaluated_at, evaluator_version = excluded.evaluator_version, source = excluded.source
    `;
    await finishOperation(sql, key, { evaluation });
    return { ok: true as const, evaluation };
  });

export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  await ensureReadReady();
  const sql = await getSql();
  const total = await sql<{ c: number }>`
    select count(*)::int as c from claims
    where not exists (select 1 from claim_aliases alias_row where alias_row.alias_id = claims.id)
  `;
  const open = await sql<{ c: number }>`
    select count(*)::int as c from claims
    where not exists (select 1 from claim_aliases alias_row where alias_row.alias_id = claims.id)
      and registry = 'onchain' and status in ('OPEN','CHALLENGED')
  `;
  const finalized = await sql<{ c: number }>`
    select count(*)::int as c from claims
    where not exists (select 1 from claim_aliases alias_row where alias_row.alias_id = claims.id)
      and registry = 'onchain' and status = 'FINALIZED'
  `;
  const challenged = await sql<{ c: number }>`
    select count(*)::int as c from challenges
    where not exists (select 1 from claim_aliases alias_row where alias_row.alias_id = challenges.claim_id)
  `;
  return { claims: total[0]?.c ?? 0, open: open[0]?.c ?? 0, finalized: finalized[0]?.c ?? 0, challenges: challenged[0]?.c ?? 0, network: getPublicNetwork() };
});
