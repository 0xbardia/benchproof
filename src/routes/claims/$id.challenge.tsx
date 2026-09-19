import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { challengeClaim, getClaim } from "@/lib/benchproof/queries";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { CATEGORY_LABELS, CHALLENGE_CATEGORIES } from "@/lib/benchproof/constants";

export const Route = createFileRoute("/claims/$id/challenge")({
  loader: ({ params }) => getClaim({ data: { id: params.id } }),
  component: ChallengePage,
});

function ChallengePage() {
  const { id } = Route.useParams();
  const loaded = Route.useLoaderData();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["claim", id],
    queryFn: () => getClaim({ data: { id } }),
    initialData: loaded,
  });
  const [pending, setPending] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [challenger, setChallenger] = useState("");
  const [category, setCategory] = useState("misleading_headline");
  const [reason, setReason] = useState("");
  const [explanation, setExplanation] = useState("");
  const [evidenceUri, setEvidenceUri] = useState("");
  const [evidenceHash, setEvidenceHash] = useState("");

  const claim = q.data?.claim;

  if (q.isLoading) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-ink-muted">Loading claim…</main>;
  }
  if (!claim) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl">Claim not found</h1>
        <Button asChild className="mt-6"><Link to="/claims">Back to claims</Link></Button>
      </main>
    );
  }
  if (claim.onchainId == null || !["OPEN", "CHALLENGED"].includes(claim.status)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">Challenge unavailable</p>
        <h1 className="mt-2 font-display text-3xl">This case is not open for canonical review</h1>
        <p className="mt-2 text-ink-muted">Challenges are recorded only after the claim is confirmed on GenLayer and while its chain status is OPEN or CHALLENGED.</p>
        <Button asChild className="mt-6"><Link to="/claims/$id" params={{ id }}>Back to case</Link></Button>
      </main>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const operationKey = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(operationKey);
    try {
      const res = await challengeClaim({
        data: { idempotencyKey: operationKey, claimId: id, challenger, category, reason, explanation, evidenceUri, evidenceHash },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Challenge confirmed on GenLayer");
      await navigate({ to: "/claims/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not file challenge");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">Challenge</p>
      <h1 className="mt-2 font-display text-3xl">Contest this claim</h1>
      {claim ? (
        <p className="mt-2 text-ink-muted">
          Filing against <span className="text-ink">{claim.title}</span>. The chain signer determines
          authorship; this display name is not an authenticated wallet identity.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="challenger">Reviewer display name</Label>
            <Input
              id="challenger"
            value={challenger}
            onChange={(e) => setChallenger(e.target.value)}
              placeholder="Your name or reviewer address"
              maxLength={80}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="challenge-category">Category</Label>
          <select
            id="challenge-category"
            className="h-11 rounded-md border border-rule bg-paper-elevated px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CHALLENGE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="challenge-reason">Reason</Label>
          <Input id="challenge-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={400} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="challenge-explanation">Explanation</Label>
          <Textarea id="challenge-explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={2000} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="challenge-evidence-uri">Supporting source URI</Label>
          <Input id="challenge-evidence-uri" value={evidenceUri} onChange={(e) => setEvidenceUri(e.target.value)} maxLength={512} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="challenge-evidence-hash">Supporting artifact hash</Label>
          <Input id="challenge-evidence-hash" value={evidenceHash} onChange={(e) => setEvidenceHash(e.target.value)} maxLength={128} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={pending} variant="seal">
            {pending ? "Filing…" : "File challenge"}
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link to="/claims/$id" params={{ id }}>
              Cancel
            </Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
