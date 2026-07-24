import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Router as WouterRouter } from 'wouter';
import { ThemeProvider } from 'next-themes';
import { ClerkAuthProvider } from '@/lib/auth';
import { AppRouter } from '@/router';
import { Analytics } from '@vercel/analytics/react';
import { ConsentBanner } from '@/components/consent-banner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reuse fetched data across navigations instead of refetching on every
      // mount / window focus — makes moving between pages feel instant and
      // cuts redundant API calls (which matter on a cold serverless backend).
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <ClerkAuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
          <Analytics />
          <ConsentBanner />
        </TooltipProvider>
        </ClerkAuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
