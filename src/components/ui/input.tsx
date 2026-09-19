import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-md border border-rule bg-paper-elevated px-3 text-sm text-ink placeholder:text-ink-subtle",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-lg border border-rule bg-paper-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-subtle",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-xs font-medium uppercase tracking-[0.14em] text-ink-muted", className)}
      {...props}
    />
  );
}
