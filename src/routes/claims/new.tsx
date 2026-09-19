import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { EVIDENCE_KINDS, LIMITS } from "@/lib/benchproof/constants";
import { EMPTY_CONDITIONS, type Conditions, type CreateClaimInput } from "@/lib/benchproof/types";
import { createClaim, hashEvidenceFn } from "@/lib/benchproof/queries";

export const Route = createFileRoute("/claims/new")({ component: NewClaim });

type EvDraft = { kind: string; uri: string; note: string; contentHash: string };
const emptyEv = (): EvDraft => ({ kind: "report", uri: "", note: "", contentHash: "" });

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

function NewClaim() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [claimant, setClaimant] = useState("");
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [modelA, setModelA] = useState("");
  const [modelAVersion, setModelAVersion] = useState("");
  const [modelB, setModelB] = useState("");
  const [modelBVersion, setModelBVersion] = useState("");
  const [benchmark, setBenchmark] = useState("");
  const [benchmarkVersion, setBenchmarkVersion] = useState("");
  const [evaluationDate, setEvaluationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [metric, setMetric] = useState("");
  const [reportedResult, setReportedResult] = useState("");
  const [methodology, setMethodology] = useState("");
  const [sourceUrls, setSourceUrls] = useState("");
  const [conditions, setConditions] = useState<Conditions>({ ...EMPTY_CONDITIONS });
  const [evidence, setEvidence] = useState<EvDraft[]>([emptyEv()]);

  const payload: Omit<CreateClaimInput, "idempotencyKey"> = useMemo(
    () => ({
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
      sourceUrls: sourceUrls.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean),
      conditions,
      evidence: evidence.filter((item) => item.uri || item.note || item.contentHash),
    }),
    [
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
    ],
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const operationKey = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(operationKey);
    try {
      const hashed = {
        ...payload,
        idempotencyKey: operationKey,
        evidence: await Promise.all(
          payload.evidence.map(async (item) => {
            if (item.contentHash) return item;
            const response = await hashEvidenceFn({ data: { kind: item.kind, uri: item.uri, note: item.note } });
            return { ...item, contentHash: response.hash };
          }),
        ),
      };
      const response = await createClaim({ data: hashed });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Claim draft saved");
      await navigate({ to: "/claims/$id", params: { id: response.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save claim");
    } finally {
      setPending(false);
    }
  }

  function setCond<K extends keyof Conditions>(key: K, value: Conditions[K]) {
    setConditions((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">New case</p>
      <h1 className="mt-2 font-display text-3xl">File a benchmark claim</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        State the comparison precisely, disclose the conditions, and attach the sources a reviewer can inspect.
      </p>

      <form onSubmit={onSubmit} className="mt-10 grid gap-10">
        <fieldset className="grid min-w-0 gap-4">
          <legend className="font-display text-xl">Claim</legend>
          <Field id="claimant" label="Claimant display name (not an authenticated wallet identity)" hint="V1 records the service signer on GenLayer; this field identifies the publisher in the case file.">
            <Input id="claimant" value={claimant} onChange={(event) => setClaimant(event.target.value)} maxLength={LIMITS.claimant} placeholder="The lab or person publishing the claim" required />
          </Field>
          <Field id="title" label="Case title">
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={LIMITS.title} required />
          </Field>
          <Field id="statement" label="Exact claim statement" hint="Write the sentence BenchProof will judge—not a broader marketing summary.">
            <Textarea id="statement" value={statement} onChange={(event) => setStatement(event.target.value)} maxLength={LIMITS.statement} placeholder="Model A scores X on benchmark B versus Model B under matched conditions…" required />
          </Field>
        </fieldset>

        <fieldset className="grid min-w-0 gap-4">
          <legend className="font-display text-xl">Models and benchmark</legend>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field id="model-a" label="Model A"><Input id="model-a" value={modelA} onChange={(event) => setModelA(event.target.value)} maxLength={LIMITS.model} required /></Field>
            <Field id="model-a-version" label="Model A version"><Input id="model-a-version" value={modelAVersion} onChange={(event) => setModelAVersion(event.target.value)} maxLength={LIMITS.version} required /></Field>
            <Field id="model-b" label="Model B / baseline"><Input id="model-b" value={modelB} onChange={(event) => setModelB(event.target.value)} maxLength={LIMITS.model} required /></Field>
            <Field id="model-b-version" label="Model B version"><Input id="model-b-version" value={modelBVersion} onChange={(event) => setModelBVersion(event.target.value)} maxLength={LIMITS.version} required /></Field>
            <Field id="benchmark" label="Benchmark"><Input id="benchmark" value={benchmark} onChange={(event) => setBenchmark(event.target.value)} maxLength={LIMITS.benchmark} required /></Field>
            <Field id="benchmark-version" label="Benchmark version"><Input id="benchmark-version" value={benchmarkVersion} onChange={(event) => setBenchmarkVersion(event.target.value)} maxLength={LIMITS.version} required /></Field>
            <Field id="evaluation-date" label="Evaluation date"><Input id="evaluation-date" type="date" value={evaluationDate} onChange={(event) => setEvaluationDate(event.target.value)} required /></Field>
            <Field id="metric" label="Metric"><Input id="metric" value={metric} onChange={(event) => setMetric(event.target.value)} maxLength={LIMITS.metric} placeholder="resolved %, pass@1…" required /></Field>
          </div>
          <Field id="reported-result" label="Reported result"><Input id="reported-result" value={reportedResult} onChange={(event) => setReportedResult(event.target.value)} maxLength={LIMITS.result} required /></Field>
        </fieldset>

        <fieldset className="grid min-w-0 gap-4">
          <legend className="font-display text-xl">Conditions <span className="text-ink-muted">— the part leaderboards skip</span></legend>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field id="retries-a" label="Retries A"><Input id="retries-a" value={conditions.retriesA} onChange={(event) => setCond("retriesA", event.target.value)} /></Field>
            <Field id="retries-b" label="Retries B"><Input id="retries-b" value={conditions.retriesB} onChange={(event) => setCond("retriesB", event.target.value)} /></Field>
            <Field id="temperature-a" label="Temperature A"><Input id="temperature-a" value={conditions.temperatureA} onChange={(event) => setCond("temperatureA", event.target.value)} /></Field>
            <Field id="temperature-b" label="Temperature B"><Input id="temperature-b" value={conditions.temperatureB} onChange={(event) => setCond("temperatureB", event.target.value)} /></Field>
            <Field id="tools-a" label="Tools A"><Input id="tools-a" value={conditions.toolsA} onChange={(event) => setCond("toolsA", event.target.value)} /></Field>
            <Field id="tools-b" label="Tools B"><Input id="tools-b" value={conditions.toolsB} onChange={(event) => setCond("toolsB", event.target.value)} /></Field>
            <Field id="prompt-parity" label="Prompt parity"><select id="prompt-parity" className="h-11 min-w-0 rounded-md border border-rule bg-paper-elevated px-3 text-sm" value={conditions.promptParity} onChange={(event) => setCond("promptParity", event.target.value as Conditions["promptParity"])}><option value="matched">matched</option><option value="unmatched">unmatched</option><option value="undisclosed">undisclosed</option></select></Field>
            <Field id="system-prompt-parity" label="System prompt parity"><select id="system-prompt-parity" className="h-11 min-w-0 rounded-md border border-rule bg-paper-elevated px-3 text-sm" value={conditions.systemPromptParity} onChange={(event) => setCond("systemPromptParity", event.target.value as Conditions["systemPromptParity"])}><option value="matched">matched</option><option value="unmatched">unmatched</option><option value="undisclosed">undisclosed</option></select></Field>
            <Field id="sample-size" label="Sample size"><Input id="sample-size" value={conditions.sampleSize} onChange={(event) => setCond("sampleSize", event.target.value)} /></Field>
            <Field id="exclusions" label="Exclusions"><Input id="exclusions" value={conditions.exclusions} onChange={(event) => setCond("exclusions", event.target.value)} /></Field>
          </div>
        </fieldset>

        <fieldset className="grid min-w-0 gap-4">
          <legend className="font-display text-xl">Methodology and sources</legend>
          <Field id="methodology" label="Methodology" hint="Include prompts, system prompts, retries, tools, sampling, exclusions, and metric calculation."><Textarea id="methodology" value={methodology} onChange={(event) => setMethodology(event.target.value)} maxLength={LIMITS.methodology} className="min-h-36" /></Field>
          <Field id="source-urls" label="Source URLs (one per line)" hint="A URL points to a source; it is not proof that BenchProof fetched or verified the artifact."><Textarea id="source-urls" value={sourceUrls} onChange={(event) => setSourceUrls(event.target.value)} maxLength={LIMITS.sourceUrls} /></Field>
        </fieldset>

        <fieldset className="grid min-w-0 gap-4">
          <legend className="font-display text-xl">Evidence</legend>
          <p className="text-sm text-ink-muted">Hashes are computed over kind, URI, and note. The contract stores the hash and reference, not the file.</p>
          {evidence.map((item, index) => (
            <div key={index} className="grid min-w-0 gap-3 rounded-lg border border-rule p-4">
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <Field id={`evidence-kind-${index}`} label="Kind"><select id={`evidence-kind-${index}`} className="h-11 min-w-0 rounded-md border border-rule bg-paper-elevated px-3 text-sm" value={item.kind} onChange={(event) => setEvidence((list) => list.map((current, currentIndex) => currentIndex === index ? { ...current, kind: event.target.value } : current))}>{EVIDENCE_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></Field>
                <Field id={`evidence-uri-${index}`} label="Source URI"><Input id={`evidence-uri-${index}`} value={item.uri} maxLength={LIMITS.uri} onChange={(event) => setEvidence((list) => list.map((current, currentIndex) => currentIndex === index ? { ...current, uri: event.target.value } : current))} /></Field>
              </div>
              <Field id={`evidence-note-${index}`} label="Evidence note"><Textarea id={`evidence-note-${index}`} value={item.note} maxLength={LIMITS.note} onChange={(event) => setEvidence((list) => list.map((current, currentIndex) => currentIndex === index ? { ...current, note: event.target.value } : current))} /></Field>
            </div>
          ))}
          {evidence.length < LIMITS.evidence ? <Button type="button" variant="secondary" onClick={() => setEvidence((items) => [...items, emptyEv()])}>Add evidence</Button> : null}
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save claim draft"}</Button>
          <p className="text-xs text-ink-muted">This saves a durable off-chain draft. Open the case file to record it on GenLayer and wait for canonical confirmation.</p>
        </div>
      </form>
    </main>
  );
}
