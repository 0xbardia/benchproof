import { cn } from "@/lib/utils";
import type { VerdictType } from "@/lib/benchproof/constants";

const COPY: Record<VerdictType, { label: string; mark: string; tone: string; caption: string }> = {
  SUPPORTED: {
    label: "Supported",
    mark: "✓",
    tone: "text-forest border-forest",
    caption: "Evidence fairly supports the published claim.",
  },
  PARTIALLY_SUPPORTED: {
    label: "Partially supported",
    mark: "◐",
    tone: "text-amber border-amber",
    caption: "A narrower claim would be fair. The published wording overreaches.",
  },
  INSUFFICIENT_EVIDENCE: {
    label: "Insufficient evidence",
    mark: "—",
    tone: "text-slate border-slate",
    caption: "The score is not backed by enough methodology or artifacts.",
  },
  MISLEADING: {
    label: "Misleading",
    mark: "△",
    tone: "text-seal border-seal",
    caption: "The headline is not a fair reading of the evidence.",
  },
  INVALID: {
    label: "Invalid",
    mark: "×",
    tone: "text-ink border-ink",
    caption: "The submission is not a well-formed benchmark claim.",
  },
};

export function VerdictStamp({
  verdict,
  size = "md",
  canonical = true,
  className,
}: {
  verdict: VerdictType | "";
  size?: "sm" | "md" | "lg";
  canonical?: boolean;
  className?: string;
}) {
  if (!verdict) {
    return (
      <span
        className={cn(
          "stamp border-ink-subtle text-ink-subtle px-3 py-2 text-[10px]",
          className,
        )}
      >
        Pending
      </span>
    );
  }
  const spec = COPY[verdict];
  const sizes = {
    sm: "px-2.5 py-1.5 text-[10px]",
    md: "px-4 py-3 text-xs",
    lg: "px-6 py-4 text-sm",
  };
  return (
    <span
      className={cn("stamp", spec.tone, sizes[size], !canonical && "border-dashed opacity-80", className)}
      title={canonical ? spec.caption : `Preview only. ${spec.caption}`}
      aria-label={`${canonical ? "Canonical GenLayer verdict" : "Preview verdict"}: ${spec.label}`}
    >
      <span aria-hidden="true" className="mr-1">{spec.mark}</span>{spec.label}
    </span>
  );
}

export function verdictCaption(verdict: VerdictType | "") {
  if (!verdict) return "No verdict yet.";
  return COPY[verdict].caption;
}

export function verdictTone(verdict: VerdictType | ""): "ink" | "seal" | "forest" | "amber" | "slate" {
  if (verdict === "SUPPORTED") return "forest";
  if (verdict === "MISLEADING") return "seal";
  if (verdict === "INVALID") return "ink";
  if (verdict === "PARTIALLY_SUPPORTED") return "amber";
  if (verdict === "INSUFFICIENT_EVIDENCE") return "slate";
  return "ink";
}
