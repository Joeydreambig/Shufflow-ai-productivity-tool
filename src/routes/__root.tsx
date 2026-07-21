import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { ThemeApplier } from "@/components/ThemeApplier";
import { OnboardingGate } from "@/components/OnboardingCarousel";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { resetDemoState, restoreOrdinaryState } from "@/lib/demo";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Shufflow — Focus, one small win at a time" },
      {
        name: "description",
        content:
          "AI-powered focus sessions: break goals into small steps, run a timer with chimes, and shuffle when you stall.",
      },
      { name: "author", content: "Shufflow" },
      { property: "og:title", content: "Shufflow — Focus, one small win at a time" },
      {
        property: "og:description",
        content:
          "AI-powered focus sessions: break goals into small steps, run a timer with chimes, and shuffle when you stall.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Shufflow — Focus, one small win at a time" },
      {
        name: "twitter:description",
        content:
          "AI-powered focus sessions: break goals into small steps, run a timer with chimes, and shuffle when you stall.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a4c36c64-9139-46cc-85ff-3c8b8ca103e6/id-preview-4bbeda62--ccce5ff8-83c0-4f33-9aa5-eda3cf672685.lovable.app-1778251986558.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a4c36c64-9139-46cc-85ff-3c8b8ca103e6/id-preview-4bbeda62--ccce5ff8-83c0-4f33-9aa5-eda3cf672685.lovable.app-1778251986558.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppEnvironment />
      <ThemeApplier />
      <div className="min-h-screen mx-auto w-full max-w-6xl">
        <Outlet />
      </div>
      <OnboardingGate />
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}

function AppEnvironment() {
  const language = useAppStore((state) => state.settings.language);
  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-Hans" : "en";
  }, [language]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "restore") {
      restoreOrdinaryState();
      return;
    }
    if (params.get("demo") === "true" && params.get("reset") === "1") {
      resetDemoState();
      params.delete("reset");
      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    }
  }, []);
  return null;
}
