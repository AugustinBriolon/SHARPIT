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
  /**
   * When true, chrome uses the standard Moi icon (CircleUser) instead of an
   * initials pastille — demo banner is enough; no « D » glyph.
   */
  preferStandardIcon?: boolean;
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
  preferStandardIcon: DEMO_IDENTITY.preferStandardIcon,
};

/** Static Moi tab when Clerk is skipped (`NEXT_PUBLIC_DEV_BYPASS_CLERK`). */
const BYPASS_NAV_IDENTITY: AthleteNavIdentity = {
  isReady: true,
  initials: 'M',
  shortLabel: 'Moi',
  fullLabel: 'Moi',
  email: null,
};

const clerkBypassEnabled =
  process.env.NEXT_PUBLIC_DEV_BYPASS_CLERK === 'true' && process.env.NODE_ENV === 'development';

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

function useAthleteNavIdentityFromClerk(): AthleteNavIdentity {
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

function useAthleteNavIdentityBypass(): AthleteNavIdentity {
  return BYPASS_NAV_IDENTITY;
}

/**
 * Nav-facing identity from Clerk, with demo / empty fallbacks.
 * Keeps UserButton out of the chrome — Settings owns sign-out.
 *
 * When `NEXT_PUBLIC_DEV_BYPASS_CLERK` skips `ClerkProvider`, we never call
 * `useUser` (it would throw). The branch is a build-time constant.
 */
export const useAthleteNavIdentity: () => AthleteNavIdentity = clerkBypassEnabled
  ? useAthleteNavIdentityBypass
  : useAthleteNavIdentityFromClerk;
