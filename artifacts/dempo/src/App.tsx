import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Router as WouterRouter } from 'wouter';
import { ThemeProvider } from 'next-themes';
import { ClerkAuthProvider } from '@/lib/auth';
import { AppRouter } from '@/router';
import { Analytics } from '@vercel/analytics/react';

const queryClient = new QueryClient();

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
        </TooltipProvider>
        </ClerkAuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
