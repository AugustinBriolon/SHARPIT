import { SignOutButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { ShieldX } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { isAllowedUser } from '@/lib/auth';
import { isDemoSession } from '@/lib/demo/demo-session';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';

/**
 * The allow-list gate for this mono-athlete app, rendered as an overlay
 * *beside* the app shell rather than around it.
 *
 * Authentication is not enforced here — the Clerk proxy already redirects
 * anonymous visitors to /sign-in before a request reaches this layout. What is
 * left is the allow-list: a signed-in account that is not the athlete's. Wrapped
 * in `<Suspense>` by its caller, this awaits Clerk at request time while the app
 * chrome prerenders, which is what lets every route below have a static shell.
 * A disallowed account therefore sees empty chrome for the moment before this
 * covers the screen.
 */
export async function AccessGate() {
  if (isDevClerkBypass()) return null;
  if (await isDemoSession()) return null;

  const user = await currentUser();
  if (!user) redirect('/sign-in');
  if (isAllowedUser(user)) return null;

  return (
    <div className="bg-background fixed inset-0 z-100 flex flex-col items-center justify-center gap-4 p-6 text-center">
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
