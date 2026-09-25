import { cache } from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';
import { isDemoSession } from '@/lib/demo/demo-session';

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Solo-operator gate for /admin — no `role` column, no billing yet. The
 * allowlist lives in `ADMIN_EMAILS` (comma-separated) so the very first admin
 * doesn't need a database row to grant themselves access.
 */
export const isCurrentUserAdmin = cache(async (): Promise<boolean> => {
  if (isDevClerkBypass()) {
    return true;
  }
  if (await isDemoSession()) {
    return false;
  }

  const allowed = adminEmails();
  if (allowed.length === 0) {
    return false;
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  return !!email && allowed.includes(email);
});

/** Call at the top of every /admin route (layout + each API route independently). */
export async function requireAdmin(): Promise<void> {
  if (!(await isCurrentUserAdmin())) {
    notFound();
  }
}
