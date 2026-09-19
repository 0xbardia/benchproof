import { createFileRoute, Link } from "@tanstack/react-router";
import { listClaims } from "@/lib/benchproof/queries";
import { ClaimCard } from "@/components/benchproof/claim-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/claims/")({
  loader: () => listClaims(),
  component: ClaimsIndex,
});

function ClaimsIndex() {
  const data = Route.useLoaderData();
  const [filter, setFilter] = useState<"all" | "open" | "finalized">("all");
  const items = useMemo(() => {
    const all = data.items ?? [];
    if (filter === "open") return all.filter((c) => c.status === "OPEN" || c.status === "CHALLENGED");
    if (filter === "finalized") return all.filter((c) => c.status === "FINALIZED");
    return all;
  }, [data, filter]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">Registry</p>
          <h1 className="mt-2 font-display text-3xl">Claims</h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            Each case file separates what was claimed, what was attached, what was challenged, and what
            was decided.
          </p>
        </div>
        <Button asChild>
          <Link to="/claims/new">New claim</Link>
        </Button>
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        {(["all", "open", "finalized"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className="min-h-11 rounded-md px-1"
            aria-pressed={filter === f}
          >
            <Badge tone={filter === f ? "ink" : "slate"} className={filter === f ? "bg-ink text-paper-elevated" : ""}>
              {f}
            </Badge>
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-rule p-8 text-ink-muted">
            No claims in this filter.
          </p>
        ) : (
          items.map((c) => <ClaimCard key={c.id} claim={c} />)
        )}
      </div>
    </main>
  );
}
