import { SignOutButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { ShieldX } from 'lucide-react';
import { redirect } from 'next/navigation';
import { AthleteStateInitializer } from '@/components/athlete-state/athlete-state-initializer';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { isAllowedUser } from '@/lib/auth';
import { isDevClerkBypass } from '@/lib/dev-auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (isDevClerkBypass()) {
    return (
      <>
        <AthleteStateInitializer />
        <AppShell>{children}</AppShell>
      </>
    );
  }

  // Le proxy Clerk redirige déjà les visiteurs non connectés vers /sign-in.
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  if (!isAllowedUser(user)) {
    return (
      <div className="bg-background relative flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex flex-col items-center gap-4">
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
