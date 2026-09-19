import { createFileRoute, Link, Outlet, redirect, useChildMatches } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getClaim, requestEvaluation, recordClaimOnchain } from "@/lib/benchproof/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerdictStamp, verdictCaption, verdictTone } from "@/components/benchproof/verdict-stamp";
import { CATEGORY_LABELS, type ChallengeCategory } from "@/lib/benchproof/constants";
import { canEvaluate, isOperationPending } from "@/lib/benchproof/machine";
import { getPublicNetwork, explorerTxUrl, explorerAddressUrl } from "@/lib/benchproof/deployment";

export const Route = createFileRoute("/claims/$id")({
  loader: async ({ params }) => {
    const result = await getClaim({ data: { id: params.id } });
    if (result.claim && result.canonicalId && result.canonicalId !== params.id) {
      throw redirect({ to: "/claims/$id", params: { id: result.canonicalId }, replace: true });
    }
    return result;
  },
  component: ClaimDetail,
});

function asTimeLabel(value: unknown): string {
  if (!value) return "—";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function lifecycleLabel(method: string): string {
  return {
    create_claim: "Claim created",
    add_evidence: "Evidence added",
    publish_claim: "Published",
    challenge_claim: "Challenged",
    request_evaluation: "Evaluation requested",
  }[method] || method;
}

function Section({ id, kicker, title, children }: { id?: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="min-w-0 scroll-mt-24 rounded-xl border border-rule bg-paper-elevated p-5 sm:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ClaimDetail() {
  const { id } = Route.useParams();
  const loaded = Route.useLoaderData();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["claim", id],
    queryFn: () => getClaim({ data: { id } }),
    initialData: loaded,
    refetchInterval: (query) => {
      const data = query.state.data as typeof loaded | undefined;
      const current = data?.claim;
      return current && (
        isOperationPending(current.evaluationOperation) ||
        ["preparing", "awaiting_confirmation", "submitted", "consensus_pending"].includes(current.txState)
      ) ? 4_000 : false;
    },
  });
  const childMatches = useChildMatches();
  const isChallengeRoute = childMatches.some((match) => match.routeId === "/claims/$id/challenge");
  const evalMut = useMutation({
    mutationFn: (mode: "preview" | "genlayer") =>
      requestEvaluation({ data: { claimId: id, mode } }),
    onSuccess: (res) => {
      if (!res.ok) {
        if (res.pending) {
          toast.info(res.error);
          void qc.invalidateQueries({ queryKey: ["claim", id] });
        } else {
          toast.error(res.error);
        }
        return;
      }
      toast.success("Evaluation recorded");
      void qc.invalidateQueries({ queryKey: ["claim", id] });
      void qc.invalidateQueries({ queryKey: ["claims"] });
    },
    onError: () => toast.error("Evaluation failed"),
  });
  const chainMut = useMutation({
    mutationFn: () => recordClaimOnchain({ data: { claimId: id } }),
    onSuccess: (res) => {
      if (!res.ok) {
        if (res.pending) {
          toast.info(res.error);
          void qc.invalidateQueries({ queryKey: ["claim", id] });
        } else {
          toast.error(res.error);
        }
        return;
      }
      toast.success(`Recorded on GenLayer as claim #${res.onchainId}`);
      void qc.invalidateQueries({ queryKey: ["claim", id] });
      void qc.invalidateQueries({ queryKey: ["claims"] });
    },
    onError: () => toast.error("GenLayer submission failed"),
  });

  const claim = q.data?.claim;
  const network = q.data?.network ?? getPublicNetwork();

  if (q.isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-ink-muted">Loading case file…</main>
    );
  }
  if (isChallengeRoute) return <Outlet />;
  if (!claim) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="font-display text-3xl">Claim not found</h1>
        <p className="mt-2 text-ink-muted">No case file exists for this identifier.</p>
        <Button asChild className="mt-6">
          <Link to="/claims">Back to claims</Link>
        </Button>
      </main>
    );
  }

  const verdict = claim.evaluation?.verdict || "";
  const challengeable = claim.onchainId != null && ["OPEN", "CHALLENGED"].includes(claim.status);
  const previewEval = claim.onchainId == null && ["OPEN", "CHALLENGED"].includes(claim.status);
  const pendingEvaluation = claim.status !== "FINALIZED" && !claim.evaluation?.present && isOperationPending(claim.evaluationOperation);
  const chainEval = claim.onchainId != null && canEvaluate(claim.status) && !pendingEvaluation;
  const pendingRecord = claim.onchainId == null && ["preparing", "awaiting_confirmation", "submitted", "consensus_pending"].includes(claim.txState);
  const canSubmitChain = claim.onchainId == null && claim.status === "DRAFT" && network.connected && !pendingRecord;

  return (
    <main className="mx-auto max-w-5xl overflow-x-clip px-4 py-10 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
        Case file · {claim.registry === "seed" ? "worked example" : claim.registry === "onchain" ? "GenLayer · Studionet" : "public index"}
      </p>
      <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={verdictTone(verdict)}>{claim.registry === "seed" ? "Worked example" : claim.status}</Badge>
            <Badge>{claim.benchmark}</Badge>
            {claim.scenario ? <Badge>Scenario {claim.scenario}</Badge> : null}
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight text-ink">{claim.title}</h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-muted">{claim.statement}</p>
        </div>
        <div className="shrink-0">
          <VerdictStamp verdict={verdict} size="lg" canonical={claim.evaluation?.source === "genlayer"} />
          <p className="mt-3 max-w-[16rem] text-xs text-ink-muted">{verdictCaption(verdict)}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {challengeable ? (
          <Button asChild variant="secondary">
            <Link to="/claims/$id/challenge" params={{ id: claim.id }}>
              File a challenge
            </Link>
          </Button>
        ) : null}
        {canSubmitChain ? (
          <Button
            onClick={() => chainMut.mutate()}
            disabled={chainMut.isPending}
            variant="secondary"
          >
            {chainMut.isPending ? "Submitting to GenLayer…" : "Record on GenLayer"}
          </Button>
        ) : null}
        {previewEval ? (
          <Button
            onClick={() => evalMut.mutate("preview")}
            disabled={evalMut.isPending}
            variant="ghost"
          >
            {evalMut.isPending && evalMut.variables === "preview" ? "Evaluating…" : "Run preview rubric"}
          </Button>
        ) : null}
        {chainEval ? (
          <Button
            onClick={() => evalMut.mutate("genlayer")}
            disabled={evalMut.isPending}
            variant="seal"
          >
            {evalMut.isPending && evalMut.variables === "genlayer"
              ? "Validators judging…"
              : "Request GenLayer verdict"}
          </Button>
        ) : null}
      </div>
      {evalMut.isPending && evalMut.variables === "genlayer" ? (
        <p className="mt-3 text-sm text-ink-muted">
          Validator LLM consensus can take several minutes. Do not close this case file.
        </p>
      ) : null}
      {pendingEvaluation ? (
        <div className="mt-4 min-w-0 rounded-lg border border-seal/30 bg-seal/5 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-seal">Consensus pending</p>
          <p className="mt-1 text-sm text-ink-muted">
            GenLayer is still reconciling this evaluation. The operation is saved and this state survives refresh.
          </p>
          {claim.evaluationOperation?.transactionHash ? (
            <p className="mt-2 min-w-0 break-all font-mono text-xs text-ink-subtle">
              Transaction {claim.evaluationOperation.transactionHash}
            </p>
          ) : null}
        </div>
      ) : null}
      {pendingRecord ? (
        <div className="mt-4 min-w-0 rounded-lg border border-seal/30 bg-seal/5 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-seal">GenLayer submission pending</p>
          <p className="mt-1 text-sm text-ink-muted">
            This claim is being recorded and the operation is saved. Refreshing this case will not start a second submission.
          </p>
        </div>
      ) : null}

      <nav aria-label="Case sections" className="mt-8 flex gap-2 overflow-x-auto border-y border-rule py-3 text-xs text-ink-muted">
        {[
          ["Claim", "claim"],
          ["Evidence", "evidence"],
          ["Challenge", "challenge"],
          ["Verdict", "verdict"],
          ["Provenance", "provenance"],
        ].map(([label, target]) => <a key={target} href={`#${target}`} className="shrink-0 underline-offset-4 hover:text-ink hover:underline">{label}</a>)}
      </nav>

      <div className="mt-10 grid min-w-0 gap-4">
        <Section id="claim" kicker="01 · What was claimed" title="The published sentence">
          <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
            {[
              ["Model A", `${claim.modelA} · ${claim.modelAVersion}`],
              ["Model B / baseline", `${claim.modelB} · ${claim.modelBVersion}`],
              ["Benchmark", `${claim.benchmark} · ${claim.benchmarkVersion}`],
              ["Evaluation date", claim.evaluationDate],
              ["Metric", claim.metric],
              ["Reported result", claim.reportedResult],
              ["Claimant", claim.claimant],
              ["Published", asTimeLabel(claim.publishedAt)],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-rule pt-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">{k}</dt>
                <dd className="mt-1 break-all text-sm text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">Methodology</h3>
            <p className="mt-2 min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
              {claim.methodology || "Not disclosed."}
            </p>
          </div>
          <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-3">
            {[
              ["Retries", `${claim.conditions.retriesA || "—"} vs ${claim.conditions.retriesB || "—"}`],
              ["Temperature", `${claim.conditions.temperatureA || "—"} vs ${claim.conditions.temperatureB || "—"}`],
              ["Tools", `${claim.conditions.toolsA || "—"} vs ${claim.conditions.toolsB || "—"}`],
              ["Prompts", claim.conditions.promptParity],
              ["System prompts", claim.conditions.systemPromptParity],
              ["Sample", claim.conditions.sampleSize || "undisclosed"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-rule px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">{k}</p>
                <p className="mt-1 font-mono text-xs text-ink">{v}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="evidence" kicker="02 · What evidence was provided" title="Off-chain artifacts, on-chain hashes">
          <p className="text-sm text-ink-muted">
            Large files are not stored in the Intelligent Contract. The contract holds canonical hashes
            and references. The index below is the case file.
          </p>
          <ul className="mt-4 grid gap-3">
            {claim.evidence.length === 0 ? (
              <li className="text-sm text-ink-muted">No evidence attached.</li>
            ) : (
              claim.evidence.map((e) => (
                <li key={e.id} className="rounded-lg border border-rule p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{e.kind}</Badge>
                    {e.uri ? (
                      e.uri.startsWith("http") ? (
                        <a
                          href={e.uri}
                          className="min-w-0 break-all text-sm text-ink underline-offset-4 hover:underline"
                          rel="noreferrer"
                          target="_blank"
                        >
                          {e.uri}
                        </a>
                      ) : (
                        <span className="min-w-0 break-all text-sm text-ink">{e.uri}</span>
                      )
                    ) : null}
                  </div>
                  {e.note ? <p className="mt-2 text-sm text-ink-muted">{e.note}</p> : null}
                  {e.contentHash ? (
                    <p className="mt-2 break-all font-mono text-[11px] text-ink-subtle">{e.contentHash}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
          {claim.sourceUrls.length ? (
            <div className="mt-6 border-t border-rule pt-4">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">Source references</h3>
              <ul className="mt-2 grid gap-2 text-sm">
                {claim.sourceUrls.map((url) => <li key={url} className="min-w-0 break-all"><a href={url} target="_blank" rel="noreferrer" className="text-ink underline-offset-4 hover:underline">{url} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></li>)}
              </ul>
            </div>
          ) : null}
        </Section>

        <Section id="challenge" kicker="03 · What was challenged" title="Public review">
          {claim.challenges.length === 0 ? (
            <p className="text-sm text-ink-muted">No challenges filed. Absence of a challenge is not support.</p>
          ) : (
            <ol className="grid gap-3">
              {claim.challenges.map((c, i) => (
                <li key={c.id} className="rounded-lg border border-rule p-4">
                  <p className="font-mono text-[11px] text-seal">
                    Challenge {String(i + 1).padStart(2, "0")} ·{" "}
                    {CATEGORY_LABELS[c.category as ChallengeCategory] ?? c.category}
                  </p>
                  <h3 className="mt-1 font-display text-lg">{c.reason}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{c.explanation}</p>
                  <p className="mt-3 truncate font-mono text-[11px] text-ink-subtle">{c.challenger}</p>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section id="verdict" kicker="04 · What was decided" title="Verdict">
          {claim.evaluation?.present ? (
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <VerdictStamp verdict={verdict} canonical={claim.evaluation.source === "genlayer"} />
                <Badge tone={verdictTone(verdict)}>{claim.evaluation.confidence} confidence</Badge>
                <Badge>
                  {claim.evaluation.source === "genlayer"
                    ? "GenLayer consensus"
                    : claim.evaluation.source === "seed"
                      ? "Worked example (same rubric)"
                      : "Preview only · local rubric"}
                </Badge>
              </div>
              <p className="mt-4 text-base leading-relaxed text-ink">{claim.evaluation.summary}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">
                    Key findings
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink">
                    {claim.evaluation.keyFindings.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">
                    Material issues
                  </h3>
                  {claim.evaluation.materialIssues.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-muted">None recorded.</p>
                  ) : (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink">
                      {claim.evaluation.materialIssues.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">
                  Limitations
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink-muted">
                  {claim.evaluation.limitations.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              No verdict yet. File a challenge or request evaluation. The Intelligent Contract is the
              canonical judge when a deployment is connected.
            </p>
          )}
        </Section>

        <Section id="provenance" kicker="05 · Verification" title="On-chain identifiers">
          <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
            {[
              ["Claim id", claim.id],
              ["On-chain id", claim.onchainId != null ? String(claim.onchainId) : "not submitted"],
              ["Network", `${network.network} · chain ${network.chainId}`],
              ["Tx state", claim.txState || "index only"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">{k}</dt>
                <dd className="mt-1 break-all font-mono text-xs text-ink">{v}</dd>
              </div>
            ))}
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">Contract</dt>
              <dd className="mt-1 break-all font-mono text-xs text-ink">
                {network.contractAddress ? (
                  <a
                    href={explorerAddressUrl(network.contractAddress)}
                    className="underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {network.contractAddress}
                  </a>
                ) : (
                  "pending Studio deployment"
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-rule pt-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">Lifecycle transactions</h3>
            {claim.transactions.length ? (
              <ol className="mt-3 grid gap-2 text-xs">
                {claim.transactions.map((transaction) => <li key={transaction.id} className="flex min-w-0 flex-wrap items-baseline justify-between gap-2"><span className="font-medium text-ink">{lifecycleLabel(transaction.method)}</span>{explorerTxUrl(transaction.hash) ? <a href={explorerTxUrl(transaction.hash)} target="_blank" rel="noreferrer" className="min-w-0 break-all font-mono text-ink-muted underline-offset-4 hover:text-ink hover:underline">{transaction.hash}</a> : <span className="min-w-0 break-all font-mono text-ink-muted">{transaction.hash || "pending"}</span>}</li>)}
              </ol>
            ) : <p className="mt-2 text-sm text-ink-muted">No chain transaction is attached to this case file.</p>}
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            Off-chain drafts and previews never override a finalized on-chain verdict. Seeded case files illustrate the
            rubric; live GenLayer consensus is marked explicitly.{" "}
            {network.contractAddress ? (
              <a
                href={network.studio}
                className="underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Open contract in Studio
              </a>
            ) : null}
          </p>
        </Section>
      </div>
    </main>
  );
}
