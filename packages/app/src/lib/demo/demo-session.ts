import { auth } from '@clerk/nextjs/server';
import { isDevClerkBypass } from '@sharpit/app/lib/dev/dev-auth';
import { isDemoClerkUser } from '@sharpit/app/lib/demo/demo-identity';

/** Sentinel `AthleteProfile.clerkUserId` for the shared demo tenant. Real Clerk
 * ids are always `user_...`, so this can never collide with a real athlete. */
export const DEMO_CLERK_USER_ID = 'demo';

/**
 * True when the signed-in Clerk user is the shared demo user (`/demo` signs the visitor in
 * with a one-time ticket). One check for every demo-aware surface: `getCurrentAthleteId`,
 * the read-only guards, SettingsLayout, CoachPage, DemoBanner.
 */
export async function isDemoSession(): Promise<boolean> {
  if (isDevClerkBypass()) {
    return false;
  }
  const { userId } = await auth();
  return userId ? isDemoClerkUser(userId) : false;
}
