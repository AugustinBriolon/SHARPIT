import { Suspense } from 'react';
import { Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthShell({
  children,
  subtitle = "Connecte-toi pour accéder à ton espace d'entraînement.",
  beforeForm,
}: {
  children: React.ReactNode;
  subtitle?: string;
  /** Renders above the Clerk widget's Suspense boundary — e.g. a demo callout —
   * so it paints with the rest of the static chrome instead of waiting on Clerk. */
  beforeForm?: React.ReactNode;
}) {
  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="icon-well size-12" aria-hidden>
            <Activity className="size-6" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-page-title">SharpIt</h1>
            {/* Supporting copy — not metadata; keep above muted so dark mode stays AA */}
            <p className="text-foreground/80 mt-1 text-sm">{subtitle}</p>
          </div>
        </div>
        {beforeForm ? <div className="w-full">{beforeForm}</div> : null}
        {/* Clerk's widget reads the URL, so it can't be prerendered. The
            branding above it can — keep the boundary here so the auth page
            paints its chrome immediately. */}
        <div className="w-full">
          <Suspense fallback={<Skeleton className="h-[26rem] w-full" />}>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}
