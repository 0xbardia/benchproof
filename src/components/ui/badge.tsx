import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "ink",
  ...props
}: React.ComponentProps<"span"> & {
  tone?: "ink" | "seal" | "forest" | "amber" | "slate";
}) {
  const tones = {
    ink: "border-ink/20 text-ink",
    seal: "border-seal/40 text-seal",
    forest: "border-forest/40 text-forest",
    amber: "border-amber/40 text-amber",
    slate: "border-slate/40 text-slate",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
