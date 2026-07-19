import { SignOutButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { ShieldX } from 'lucide-react';
import { redirect } from 'next/navigation';
import { AthleteStateInitializer } from '@/components/athlete-state/athlete-state-initializer';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { isAllowedUser } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Le proxy Clerk redirige déjà les visiteurs non connectés vers /sign-in.
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  if (!isAllowedUser(user)) {
    return (
      <div className="bg-background relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden p-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.68_0.16_150/0.08),transparent_55%)]"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="bg-destructive/10 ring-destructive/20 flex size-12 items-center justify-center rounded-full ring-1">
            <ShieldX className="text-destructive size-6" />
          </div>
          <div>
            <h1 className="text-page-title">Accès refusé</h1>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Ce compte n&apos;est pas autorisé à accéder à SharpIt.
            </p>
          </div>
          <SignOutButton>
            <Button variant="outline">Se déconnecter</Button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <AthleteStateInitializer />
      <AppShell>{children}</AppShell>
    </>
  );
}
