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

const LOADING_IDENTITY: AthleteNavIdentity = {
  isReady: false,
  initials: '?',
  shortLabel: '…',
  fullLabel: '…',
  email: null,
};

const DEMO_NAV_IDENTITY: AthleteNavIdentity = {
  isReady: true,
  initials: DEMO_IDENTITY.initials,
  shortLabel: DEMO_IDENTITY.shortLabel,
  fullLabel: DEMO_IDENTITY.shortLabel,
  email: null,
};

function identityFromUser(
  user: NonNullable<ReturnType<typeof useUser>['user']>,
): AthleteNavIdentity {
  const parts = {
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
  };
  const shortLabel = shortLabelFromName(parts);
  return {
    isReady: true,
    initials: initialsFromName(parts),
    shortLabel,
    fullLabel: user.fullName?.trim() || shortLabel,
    email: user.primaryEmailAddress?.emailAddress ?? null,
  };
}

/**
 * Nav-facing identity from Clerk, with demo / empty fallbacks.
 * Keeps UserButton out of the chrome — Settings owns sign-out.
 */
export function useAthleteNavIdentity(): AthleteNavIdentity {
  const { user, isLoaded } = useUser();
  const isDemo = useIsDemoMode();

  if (!isLoaded) {
    return LOADING_IDENTITY;
  }
  if ((isDemo && !user) || !user) {
    return DEMO_NAV_IDENTITY;
  }
  return identityFromUser(user);
}
