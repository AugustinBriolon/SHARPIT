import { Eye } from 'lucide-react';
import { isDemoSession } from '@/lib/demo/demo-session';

/** Tells a public demo visitor they're on seeded, read-only data. Mirrors
 * OfflineBanner's placement in AppShell, passed down as a server-rendered
 * slot since AppShell is a Client Component. */
export async function DemoBanner() {
  if (!(await isDemoSession())) return null;

  return (
    <div
      className="bg-primary text-primary-foreground flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium"
      role="status"
    >
      <Eye className="size-3.5 shrink-0" aria-hidden />
      Mode démo — lecture seule, données fictives
      <a className="underline underline-offset-2" href="/api/demo/exit">
        Quitter
      </a>
    </div>
  );
}
