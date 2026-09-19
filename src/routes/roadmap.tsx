import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/roadmap")({
  component: Roadmap,
});

const PHASES = [
  { n: "0", title: "Repository audit + specification", state: "done" },
  { n: "1", title: "Contract specification", state: "done" },
  { n: "2", title: "Intelligent Contract implementation", state: "done" },
  { n: "3", title: "Contract security + adversarial tests", state: "done" },
  { n: "4", title: "Backend + GenLayer integration", state: "done" },
  { n: "5", title: "Premium UX + landing", state: "done" },
  { n: "6", title: "Claim / evidence / challenge flow", state: "done" },
  { n: "7", title: "Full integration", state: "done" },
  { n: "8", title: "GenLayer Studio deployment", state: "done" },
  { n: "9", title: "Playwright + security + QA", state: "done" },
  { n: "10", title: "Final release verification", state: "done" },
];

function Roadmap() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">Roadmap</p>
      <h1 className="mt-2 font-display text-3xl">From specification to a verifiable ledger</h1>
      <ol className="mt-10 space-y-0">
        {PHASES.map((p) => (
          <li key={p.n} className="grid grid-cols-[4rem_1fr] gap-4 border-t border-rule py-4">
            <span className="font-mono text-sm text-ink-subtle">P{p.n}</span>
            <div>
              <p className="font-display text-xl text-ink">{p.title}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                {p.state}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Later, not V1</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-muted">
          <li>Claim bonds, challenger staking, and slashing</li>
          <li>Automatic web retrieval of allow-listed harness repositories</li>
          <li>Appeals of a finalized verdict</li>
        </ul>
      </section>
    </main>
  );
}
