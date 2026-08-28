import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/auth/admin';

/**
 * Deliberately outside the `(app)` route group: no athlete shell, no
 * onboarding gate, no bottom nav — this is operator tooling, not part of the
 * athlete experience. Session auth still comes from the global middleware;
 * this layout adds the admin-only check on top of it.
 */

// Every render is athlete-private (Clerk session) and reads fresh DB state —
// there is no static shell worth prerendering for an operator-only route.
export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="bg-background text-foreground min-h-full">
      <div className="mx-auto max-w-3xl px-5 py-10">{children}</div>
    </div>
  );
}
