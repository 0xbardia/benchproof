import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { VerdictStamp, verdictTone } from "./verdict-stamp";
import type { ClaimSummary } from "@/lib/benchproof/types";

export function ClaimCard({ claim }: { claim: ClaimSummary }) {
  return (
    <Link
      to="/claims/$id"
      params={{ id: claim.id }}
      className="group block min-w-0 rounded-xl border border-rule bg-paper-elevated p-5 transition-[border-color,transform] duration-200 hover:border-ink/35"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone={verdictTone(claim.verdict)}>{claim.registry === "seed" ? "Worked example" : claim.status}</Badge>
            <Badge>{claim.benchmark}</Badge>
            {claim.registry === "onchain" ? <Badge tone="forest">On-chain</Badge> : null}
            {claim.registry === "seed" ? <Badge>Example</Badge> : null}
          </div>
          <h3 className="font-display text-xl leading-snug text-ink group-hover:underline decoration-rule-strong underline-offset-4">
            {claim.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
            {claim.statement}
          </p>
        </div>
        <VerdictStamp verdict={claim.verdict} size="sm" canonical={claim.registry === "onchain"} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-ink-muted sm:grid-cols-4">
        <div>
          <dt className="uppercase tracking-[0.14em]">Model A</dt>
          <dd className="mt-1 text-ink">{claim.modelA}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em]">Model B</dt>
          <dd className="mt-1 text-ink">{claim.modelB}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em]">Result</dt>
          <dd className="mt-1 font-mono text-ink">{claim.reportedResult}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em]">Record</dt>
          <dd className="mt-1 text-ink">
            {claim.evidenceCount} evidence · {claim.challengeCount} challenges
          </dd>
        </div>
      </dl>
    </Link>
  );
}
