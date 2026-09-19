import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicNetwork } from "@/lib/benchproof/deployment";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
});

function DocsPage() {
  const net = getPublicNetwork();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">Documentation</p>
      <h1 className="mt-2 font-display text-3xl">How BenchProof is put together</h1>

      <section className="mt-8 space-y-3 text-ink-muted leading-relaxed">
        <p>
          BenchProof is a verification layer for AI benchmark claims. The Intelligent Contract is the
          source of truth for published lifecycle state, challenges, and verdicts. The application index
          is a durable read model for evidence metadata and transaction provenance; it never promotes a
          local preview into canonical GenLayer state.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">What is local</h2>
        <p className="mt-3 leading-relaxed text-ink-muted">
          Drafts, pending operations, preview analyses, and the searchable case index live off-chain.
          A preview is always labeled separately. A finalized verdict is shown only after a finalized
          GenLayer transaction and canonical contract readback.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Architecture</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink">
          <li>A claimant publishes a structured claim plus evidence hashes.</li>
          <li>Reviewers file categorized challenges.</li>
          <li>
            <code className="font-mono text-sm">request_evaluation</code> runs a GenLayer non-comparative
            LLM consensus over untrusted data.
          </li>
          <li>The verdict is stored on-chain and mirrored in the case file.</li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Intelligent Contract</h2>
        <p className="mt-3 text-ink-muted">
          Python contract <span className="font-mono text-ink">contracts/benchproof.py</span>. States:
          DRAFT → OPEN → CHALLENGED → EVALUATING → FINALIZED. Evidence freezes at publish. Challenges
          stop when evaluation begins. Finalized claims cannot reopen.
        </p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-4 border-t border-rule pt-2">
            <dt className="text-ink-muted">Network</dt>
            <dd className="font-mono">{net.network} ({net.chainId})</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-rule pt-2">
            <dt className="text-ink-muted">RPC</dt>
            <dd className="break-all font-mono text-xs">{net.rpc}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-rule pt-2">
            <dt className="text-ink-muted">Contract</dt>
            <dd className="break-all font-mono text-xs">{net.contractAddress || "not yet deployed"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Read more</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <Link to="/methodology" className="underline-offset-4 hover:underline">
              Evaluation rubric
            </Link>
          </li>
          <li>
            <Link to="/roadmap" className="underline-offset-4 hover:underline">
              Roadmap
            </Link>
          </li>
          <li>
            <a href={net.studio} className="underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              GenLayer Studio
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
