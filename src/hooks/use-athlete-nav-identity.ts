'use client';

import { useUser } from '@clerk/nextjs';
import { DEMO_IDENTITY, initialsFromName, shortLabelFromName } from '@/lib/auth/athlete-identity';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';

export type AthleteNavIdentity = {
  /** False until Clerk (and demo cookie) have answered. */
  isReady: boolean;
  initials: string;
  shortLabel: string;
  fullLabel: string;
  email: string | null;
};

/**
 * Nav-facing identity from Clerk, with demo / empty fallbacks.
 * Keeps UserButton out of the chrome — Settings owns sign-out.
 */
export function useAthleteNavIdentity(): AthleteNavIdentity {
  const { user, isLoaded } = useUser();
  const isDemo = useIsDemoMode();

  if (!isLoaded) {
    return {
      isReady: false,
      initials: '?',
      shortLabel: '…',
      fullLabel: '…',
      email: null,
    };
  }

  if (isDemo && !user) {
    return {
      isReady: true,
      initials: DEMO_IDENTITY.initials,
      shortLabel: DEMO_IDENTITY.shortLabel,
      fullLabel: DEMO_IDENTITY.shortLabel,
      email: null,
    };
  }

  const parts = {
    firstName: user?.firstName,
    lastName: user?.lastName,
    fullName: user?.fullName,
  };

  return {
    isReady: true,
    initials: initialsFromName(parts),
    shortLabel: shortLabelFromName(parts),
    fullLabel: user?.fullName?.trim() || shortLabelFromName(parts),
    email: user?.primaryEmailAddress?.emailAddress ?? null,
  };
}
