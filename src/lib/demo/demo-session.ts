import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';
import { DEMO_COOKIE } from '@/lib/demo/demo-cookie';

export { DEMO_COOKIE };

/** Sentinel `AthleteProfile.clerkUserId` for the shared demo tenant. Real Clerk
 * ids are always `user_...`, so this can never collide with a real athlete. */
export const DEMO_CLERK_USER_ID = 'demo';

/**
 * True only for a genuinely anonymous visitor carrying the demo cookie.
 *
 * A real Clerk session always wins over a stray demo cookie left over in the
 * same browser (e.g. a signed-in athlete who once visited /demo) — otherwise
 * their own writes would be misread as a demo session and blocked, and every
 * demo-aware surface (banner, disabled Settings/Coach) would misreport their
 * real session as a demo one. Checking this here, once, keeps every call site
 * (proxy, getCurrentAthleteId, SettingsLayout, CoachPage, DemoBanner)
 * consistent without each re-deriving the same precedence.
 */
export async function isDemoSession(): Promise<boolean> {
  if (isDevClerkBypass()) return false;

  const store = await cookies();
  if (store.get(DEMO_COOKIE)?.value !== '1') return false;

  const { userId } = await auth();
  return !userId;
}
