'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';
import { useEffect, useState } from 'react';
import { clerkAppearance } from '@/lib/theme/clerk-appearance';

/**
 * Wrapper client : en dev, autorise l'origine courante (IP LAN, localhost…)
 * pour les redirects Clerk — sans config dashboard ni RegExp.
 */
export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  const [allowedRedirectOrigins, setAllowedRedirectOrigins] = useState<string[] | undefined>(
    undefined,
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const port = window.location.port || '3000';
    const origins = new Set<string>([`http://localhost:${port}`, window.location.origin]);
    setAllowedRedirectOrigins([...origins]);
  }, []);

  return (
    <ClerkProvider
      afterSignOutUrl="/sign-in"
      allowedRedirectOrigins={allowedRedirectOrigins}
      appearance={clerkAppearance}
      localization={frFR}
      signInFallbackRedirectUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
