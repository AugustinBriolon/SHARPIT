import { Lock } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { DemoExitButton } from '@/components/demo/demo-exit';
import { Button } from '@/components/ui/button';
import { isDemoSession } from '@/lib/demo/demo-session';

async function SettingsGate({ children }: { children: React.ReactNode }) {
  if (await isDemoSession()) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <Lock className="text-muted-foreground size-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-page-title">Indisponible en démo</h1>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Les réglages touchent un compte réel (identité, intégrations, données). Ils sont
            désactivés sur le compte démo partagé.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <DemoExitButton />
          <Button nativeButton={false} render={<Link href="/" />} variant="outline">
            Retour à l&apos;app
          </Button>
        </div>
      </div>
    );
  }

  return children;
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  // Awaits cookies() at request time without blocking prerender — same
  // reasoning as DemoBanner: await cookies()/auth() inside Suspense.
  return (
    <Suspense>
      <SettingsGate>{children}</SettingsGate>
    </Suspense>
  );
}
