'use client';

import { useUser } from '@clerk/nextjs';
import { DEMO_EXTERNAL_ID } from '@sharpit/app/lib/demo/demo-identity-shared';

/**
 * Same rule as server `isDemoSession()`: the signed-in Clerk user is the shared demo account.
 * Until Clerk has loaded, false (hydration-safe; no demo chrome flash for a real athlete).
 */
export function resolveIsDemoMode(
  externalId: string | null | undefined,
  userLoaded: boolean,
): boolean {
  return userLoaded && externalId === DEMO_EXTERNAL_ID;
}

/** Outside React (a mutation function): the signed-in Clerk user, read off `window.Clerk`. */
export function isBrowserDemoAccount(): boolean {
  const clerk = (globalThis as { Clerk?: { user?: { externalId?: string | null } | null } }).Clerk;
  return resolveIsDemoMode(clerk?.user?.externalId, Boolean(clerk?.user));
}

const clerkBypassEnabled =
  process.env.NEXT_PUBLIC_DEV_BYPASS_CLERK === 'true' && process.env.NODE_ENV === 'development';

function useIsDemoModeWithClerk(): boolean {
  const { user, isLoaded } = useUser();
  return resolveIsDemoMode(user?.externalId, isLoaded);
}

function useIsDemoModeBypass(): boolean {
  return false;
}

/** UI signal for demo-aware client components. */
export const useIsDemoMode: () => boolean = clerkBypassEnabled
  ? useIsDemoModeBypass
  : useIsDemoModeWithClerk;
