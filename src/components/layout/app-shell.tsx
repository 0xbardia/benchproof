import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/benchproof/constants";
import { getPublicNetwork } from "@/lib/benchproof/deployment";

const NAV = [
  { to: "/claims", label: "Claims" },
  { to: "/methodology", label: "Methodology" },
  { to: "/docs", label: "Docs" },
  { to: "/roadmap", label: "Roadmap" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const network = getPublicNetwork();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper-elevated"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-baseline gap-3">
            <span className="font-display text-xl tracking-tight text-ink">{APP_NAME}</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ink-subtle sm:inline">
              Verification ledger
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "text-sm text-ink-muted hover:text-ink",
                  pathname.startsWith(item.to) && "text-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/claims/new"
              className="inline-flex h-10 min-h-10 items-center rounded-md bg-ink px-4 text-sm text-paper-elevated"
            >
              Verify a claim
            </Link>
          </nav>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md border border-rule md:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open ? (
          <nav className="border-t border-rule px-4 py-3 md:hidden" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="block py-3 text-base text-ink"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/claims/new"
              className="mt-2 flex h-11 items-center justify-center rounded-md bg-ink text-paper-elevated"
              onClick={() => setOpen(false)}
            >
              Verify a claim
            </Link>
          </nav>
        ) : null}
      </header>
      <div id="main" className="flex-1">
        {children}
      </div>
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            {APP_NAME} — claims are judged by evidence, not by the score alone. Built on GenLayer.
          </p>
          <p className="break-all font-mono text-[11px] uppercase tracking-[0.16em]">
            {network.contractAddress
              ? `Studionet · ${network.contractAddress.slice(0, 10)}…${network.contractAddress.slice(-4)}`
              : "Intelligent contract · v1"}
          </p>
        </div>
      </footer>
    </div>
  );
}
