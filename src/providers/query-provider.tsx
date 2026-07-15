'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,
            gcTime: 30 * 60_000,
            refetchOnWindowFocus: false,
            // Explicit (matches the library default) — on reconnect, active queries
            // (the canonical Snapshot, Today's ViewModel) refetch for real rather
            // than trusting cached data; the offline read-only view naturally
            // steps aside once a fresh fetch succeeds. See ADR-008.
            refetchOnReconnect: true,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
