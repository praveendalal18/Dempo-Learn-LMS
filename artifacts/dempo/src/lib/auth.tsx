import { ClerkProvider, useAuth, SignIn, SignUp } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname so the
// same build serves multiple Clerk custom domains.
const publishableKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// Empty in dev (Clerk hits dev FAPI directly), auto-set in prod. Do NOT gate on
// PROD/NODE_ENV or add a fallback — the empty dev value is intentional.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!publishableKey) {
  throw new Error("Missing Publishable Key");
}

export function ClerkQueryClientCacheInvalidator() {
  const { sessionId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries();
  }, [sessionId, queryClient]);

  return null;
}

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      proxyUrl={clerkProxyUrl}
      appearance={{
        variables: {
          // Notion-neutral: near-black actions, restrained blue links.
          colorPrimary: 'hsl(40 8% 18%)',
          colorBackground: 'hsl(0 0% 100%)',
          fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
          borderRadius: '0.5rem',
        },
        elements: {
          card: "shadow-sm border border-border",
          headerTitle: "text-xl font-semibold text-foreground",
          headerSubtitle: "text-muted-foreground",
          formButtonPrimary:
            "bg-primary text-primary-foreground hover:bg-primary/90 font-medium border-0 shadow-none normal-case",
          footerActionLink:
            "text-info hover:text-info/80 font-medium",
        }
      }}
      localization={{
        signIn: {
          start: {
            title: "Sign in to Dempo Learn",
            subtitle: "Welcome back! Please sign in to continue",
          },
        },
        signUp: {
          start: {
            title: "Create your Dempo Learn account",
            subtitle: "Join the fun — it's free",
          },
        },
      }}
    >
      <ClerkQueryClientCacheInvalidator />
      {children}
    </ClerkProvider>
  );
}
