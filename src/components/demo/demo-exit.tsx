import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Full-page load to `/api/demo/exit` — clears the cookie and lands on `/sign-in`. */
export const DEMO_EXIT_HREF = '/api/demo/exit';

/** Inline text link for the demo banner. */
export function DemoExitTextLink({ className }: { className?: string }) {
  return (
    <a className={cn('underline underline-offset-2', className)} href={DEMO_EXIT_HREF}>
      Quitter la démo
    </a>
  );
}

/** Primary CTA for demo dead-ends (Settings, Coach) — returns to sign-in. */
export function DemoExitButton({ className }: { className?: string }) {
  return (
    <Button
      className={className}
      nativeButton={false}
      render={<a href={DEMO_EXIT_HREF} />}
      variant="default"
    >
      Quitter la démo
    </Button>
  );
}
