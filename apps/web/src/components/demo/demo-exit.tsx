'use client';

import { useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { cn } from '@sharpit/app/lib/utils';

/** Leaving the demo signs out of the shared demo account and lands on sign-in. */
export const DEMO_EXIT_REDIRECT = '/sign-in';

function useLeaveDemo(): () => void {
  const { signOut } = useClerk();
  return () => {
    void signOut({ redirectUrl: DEMO_EXIT_REDIRECT });
  };
}

/** Inline text link for the demo banner. */
export function DemoExitTextLink({ className }: { className?: string }) {
  const leaveDemo = useLeaveDemo();
  return (
    <button
      className={cn('underline underline-offset-2', className)}
      type="button"
      onClick={leaveDemo}
    >
      Quitter la démo
    </button>
  );
}

/** Primary CTA for demo dead-ends (Settings, Coach) — returns to sign-in. */
export function DemoExitButton({ className }: { className?: string }) {
  const leaveDemo = useLeaveDemo();
  return (
    <Button className={className} variant="default" onClick={leaveDemo}>
      Quitter la démo
    </Button>
  );
}
