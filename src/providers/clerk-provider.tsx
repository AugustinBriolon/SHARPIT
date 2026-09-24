'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';
import { useEffect, useState } from 'react';
import { clerkAppearance } from '@/lib/theme/clerk-appearance';

/**
 * After sign-in/up with no `redirect_url`: Today, never the teaser — `/welcome` is
 * signed-out only (the proxy enforces it). A `redirect_url` Clerk carries (e.g. back into
 * the Garmin handoff) still wins: fallbacks, not force redirects. sharpit.app is the
 * primary domain — no `isSatellite` / `domain` here.
 *
 * Wrapper client : en dev, autorise l'origine courante (IP LAN, localhost…)
 * pour les redirects Clerk — sans config dashboard ni RegExp.
 */
export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  const [allowedRedirectOrigins, setAllowedRedirectOrigins] = useState<string[] | undefined>(
    undefined,
  );

  // If DEV_BYPASS_CLERK is enabled, skip Clerk entirely
  if (
    process.env.NEXT_PUBLIC_DEV_BYPASS_CLERK === 'true' &&
    process.env.NODE_ENV === 'development'
  ) {
    return <>{children}</>;
  }

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    const port = window.location.port || '3000';
    const origins = new Set<string>([`http://localhost:${port}`, window.location.origin]);
    setAllowedRedirectOrigins([...origins]);
  }, []);

  return (
    <ClerkProvider
      afterSignOutUrl="/welcome"
      allowedRedirectOrigins={allowedRedirectOrigins}
      appearance={clerkAppearance}
      localization={frFR}
      signInFallbackRedirectUrl="/"
      signInUrl="/sign-in"
      signUpFallbackRedirectUrl="/"
      signUpUrl="/sign-up"
    >
      {children}
    </ClerkProvider>
  );
}
