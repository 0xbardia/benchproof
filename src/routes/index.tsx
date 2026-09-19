import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Scale, FileSearch, Swords, Gavel, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClaimCard } from "@/components/benchproof/claim-card";
import { VerdictStamp } from "@/components/benchproof/verdict-stamp";
import { getStats, listClaims } from "@/lib/benchproof/queries";
import { DEPLOYMENT, explorerTxUrl } from "@/lib/benchproof/deployment";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [stats, claims] = await Promise.all([getStats(), listClaims()]);
    return { stats, claims };
  },
  component: Home,
});

const EXHIBITS = [
  {
    n: "01",
    title: "Old baseline",
    body: "Compare against a 2023 checkpoint and call it “GPT-4” in 2026. The number looks large. The comparison is not.",
  },
  {
    n: "02",
    title: "Cherry-picked tasks",
    body: "Drop the instances the model failed, keep the ones it passed, then publish a headline accuracy.",
  },
  {
    n: "03",
    title: "Different retries",
    body: "Five samples with majority vote versus one greedy decode. Same benchmark name, different experiment.",
  },
  {
    n: "04",
    title: "Different prompts",
    body: "One model gets a planning scratchpad and tools. The baseline gets a bare completion prompt.",
  },
  {
    n: "05",
    title: "Hidden failed runs",
    body: "Timeouts and empty patches silently removed from the denominator.",
  },
  {
    n: "06",
    title: "Misleading headline",
    body: "A 3-point gain on a matched split becomes “20% better at agentic coding.”",
  },
];

const STEPS = [
  { icon: FileSearch, title: "Submit claim", body: "Exact statement, models, versions, metric, and methodology." },
  { icon: Stamp, title: "Attach evidence", body: "Hashes and references live on-chain. Large artifacts stay off-chain." },
  { icon: Swords, title: "Challenge", body: "Anyone can contest retries, prompts, baselines, leakage, or headlines." },
  { icon: Scale, title: "GenLayer evaluates", body: "Validators reach consensus on whether the evidence fairly supports the claim." },
  { icon: Gavel, title: "Verdict is verifiable", body: "SUPPORTED is not a score. It is a public, inspectable judgment." },
];

function Home() {
  const { stats, claims } = Route.useLoaderData();
  const featured = claims.items.find((c) => c.id === "seed-misleading") ?? claims.items[0];
  const latest = claims.items.slice(0, 3);
  const live = claims.items.find((claim) => claim.registry === "onchain" && claim.onchainId === claims.network.evaluationClaimId);
  const liveVerdict = live?.verdict || DEPLOYMENT.evaluationVerdict;

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">
          Vol. 1 · Claim → Evidence → Challenge → Judgment
        </p>
        <h1 className="mt-4 max-w-4xl font-display text-3xl leading-[1.05] text-ink sm:text-3xl">
          Prove the benchmark, not just the score.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
          AI labs publish numbers. BenchProof asks whether the evidence fairly supports the sentence
          those numbers are wrapped in.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/claims/new">
              Verify a claim <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/claims">Explore claims</Link>
          </Button>
        </div>
        <dl className="mt-12 grid grid-cols-2 gap-4 border-y border-rule py-6 sm:grid-cols-4">
          {[
            ["Claims", stats.claims],
            ["Open", stats.open],
            ["Finalized", stats.finalized],
            ["Challenges", stats.challenges],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">{k}</dt>
              <dd className="mt-1 font-display text-3xl tabular-nums text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 rounded-xl border border-rule bg-paper-elevated p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-seal">
              {live ? "Current canonical Studionet verdict" : "Last verified deployment proof"}
            </p>
            <p className="mt-2 font-display text-xl text-ink">
              Claim {live?.onchainId ?? DEPLOYMENT.evaluationClaimId} · {liveVerdict}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {live ? "Read from the synchronized contract state after canonical finalization." : "The index is waiting for its next safe chain sync; the case file remains the source of proof."}
            </p>
          </div>
          <div className="mt-4 flex shrink-0 flex-col gap-2 sm:mt-0">
            <Button asChild variant="secondary">
              <Link to="/claims/$id" params={{ id: live?.id ?? `onchain-${DEPLOYMENT.evaluationClaimId}` }}>
                Open the case file
              </Link>
            </Button>
            <a
              href={explorerTxUrl(DEPLOYMENT.evaluationTx)}
              className="text-center font-mono text-[11px] text-ink-muted underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Evaluation tx
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-rule bg-paper-elevated/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">The problem</p>
          <h2 className="mt-2 max-w-3xl font-display text-2xl text-ink">
            Benchmark claims are easy to publish and difficult to independently verify.
          </h2>
          <p className="mt-4 max-w-2xl text-ink-muted">
            A leaderboard compares two numbers. BenchProof compares the experiment. If Model A had five
            retries and Model B had one, “20% better” is a marketing sentence, not a result.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXHIBITS.map((ex) => (
              <article key={ex.n} className="rounded-xl border border-rule bg-paper p-5">
                <p className="font-mono text-[11px] text-seal">Exhibit {ex.n}</p>
                <h3 className="mt-2 font-display text-xl text-ink">{ex.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{ex.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">How it works</p>
        <h2 className="mt-2 font-display text-2xl text-ink">Five steps. One question.</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-rule bg-paper-elevated p-4">
              <step.icon className="size-5 text-ink" aria-hidden />
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-1 font-display text-lg text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-rule bg-ink text-paper-elevated">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-elevated/60">
              Example case
            </p>
            <h2 className="mt-2 font-display text-3xl">“20% better” with unequal retries.</h2>
            <p className="mt-4 max-w-xl text-paper-elevated/80">
              A published agentic-coding claim reported a 20% relative gain. The evidence showed Model A
              received five retries and extra tools; Model B received one attempt. The headline did not
              disclose the gap. BenchProof does not average the two scores. It asks whether the sentence
              is fair.
            </p>
            <div className="mt-6">
              <Button asChild variant="secondary">
                <Link to="/claims/$id" params={{ id: featured?.id ?? "seed-misleading" }}>
                  Open the case file
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative rounded-xl border border-paper-elevated/15 bg-ink p-6">
            <div className="absolute right-6 top-6">
            <VerdictStamp verdict="MISLEADING" size="lg" canonical={false} className="border-seal text-seal bg-ink" />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper-elevated/50">
              Case B · Worked example · MISLEADING
            </p>
            <p className="mt-10 max-w-sm font-display text-2xl leading-snug">
              Model A is 20% better than Model B on agentic coding tasks.
            </p>
            <dl className="mt-8 space-y-2 text-sm text-paper-elevated/70">
              <div className="flex justify-between gap-4 border-t border-paper-elevated/10 pt-2">
                <dt>Retries</dt>
                <dd className="font-mono">5 vs 1</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-paper-elevated/10 pt-2">
                <dt>Tools</dt>
                <dd className="font-mono">web+python vs bash</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-paper-elevated/10 pt-2">
                <dt>Headline discloses gap</dt>
                <dd className="font-mono">no</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">Why GenLayer</p>
        <h2 className="mt-2 max-w-3xl font-display text-2xl text-ink">
          This cannot be reduced to <span className="italic">if scoreA {'>'} scoreB</span>.
        </h2>
        <p className="mt-4 max-w-2xl text-ink-muted">
          Whether a claim is misleading is a judgment over unstructured evidence: reports, configs,
          hashes, challenges. Intelligent Contracts let validators reason over that record, then agree on
          meaning rather than on a byte. Remove GenLayer and BenchProof is just another form. With it,
          the verdict is a consensus artifact.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Untrusted data", "Evidence is wrapped as data. Jailbreaks cannot rewrite the rubric."],
            ["Structured verdict", "SUPPORTED is an enum, not a paragraph that can be massaged."],
            ["Fail-safe", "A broken evaluator output is INVALID — never silently SUPPORTED."],
          ].map(([t, b]) => (
            <article key={t} className="rounded-xl border border-rule bg-paper-elevated p-5">
              <h3 className="font-display text-lg">{t}</h3>
              <p className="mt-2 text-sm text-ink-muted">{b}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-rule bg-paper-elevated/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">Ledger</p>
              <h2 className="mt-2 font-display text-2xl">Recent claims</h2>
            </div>
            <Link to="/claims" className="text-sm text-ink underline-offset-4 hover:underline">
              All claims
            </Link>
          </div>
          <div className="mt-8 grid gap-4">
            {latest.map((c) => (
              <ClaimCard key={c.id} claim={c} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-xl border border-rule bg-paper-elevated px-6 py-10 sm:px-10">
          <Badge>Built on GenLayer</Badge>
          <h2 className="mt-4 font-display text-3xl text-ink">Submit a claim. Attach the evidence. Let it be judged.</h2>
          <p className="mt-3 max-w-xl text-ink-muted">
            If the comparison was fair, the record will say so. If it was not, the record will say why.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/claims/new">Verify a claim</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/methodology">Read the rubric</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
