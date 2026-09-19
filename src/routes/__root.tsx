import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppShell } from "@/components/layout/app-shell";
import { APP_NAME, APP_TAGLINE } from "@/lib/benchproof/constants";
import appCss from "../styles.css?url";

const APP_TITLE = `${APP_NAME} — ${APP_TAGLINE}`;
const APP_DESCRIPTION =
  "BenchProof verifies whether AI benchmark claims are fairly supported by their submitted evidence and methodology using GenLayer.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_TITLE },
      {
        name: "description",
        content: APP_DESCRIPTION,
      },
      { name: "theme-color", content: "#1C1915" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "canonical", href: "https://benchproof.bydx.fun/" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,400;6..72,560;6..72,650&family=Public+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      },
    ],
  }),
  notFoundComponent: NotFoundPage,
  component: RootDocument,
});

function NotFoundPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">404 · Case file not found</p>
      <h1 className="mt-3 font-display text-4xl text-ink">This page is not in the ledger.</h1>
      <p className="mt-3 max-w-xl text-ink-muted">The address does not match a BenchProof case or published route.</p>
      <Link to="/claims" className="mt-6 inline-flex rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated">
        Return to claims
      </Link>
    </main>
  );
}

function RootDocument() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <AppShell>
              <Outlet />
            </AppShell>
            <Toaster
              theme="light"
              position="bottom-right"
              toastOptions={{
                className: "font-sans border-rule bg-paper-elevated text-ink",
              }}
            />
          </QueryClientProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
