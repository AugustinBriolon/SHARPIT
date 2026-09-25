'use client';

import { SignOutButton, useAuth, useUser } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const clerkBypassEnabled =
  process.env.NEXT_PUBLIC_DEV_BYPASS_CLERK === 'true' && process.env.NODE_ENV === 'development';

/**
 * Ends the Clerk session. Shown only when there is a real signed-in session —
 * not gated on the demo cookie alone, so a leftover `/demo` cookie cannot hide
 * sign-out for a real athlete (SettingsGate already allows that case).
 */
function SettingsSignOutWithClerk() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

  if (!authLoaded || !userLoaded || !isSignedIn) {
    return null;
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  return (
    <section aria-labelledby="settings-session" className="space-y-3">
      <div>
        <h2 className="text-section-title" id="settings-session">
          Session
        </h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {email
            ? `Connecté en tant que ${email}. La déconnexion renvoie à l’écran d’entrée.`
            : 'La déconnexion renvoie à l’écran d’entrée.'}
        </p>
      </div>
      <SignOutButton>
        <Button className="w-full justify-center gap-2" type="button" variant="outline">
          <LogOut aria-hidden />
          Se déconnecter
        </Button>
      </SignOutButton>
    </section>
  );
}

function SettingsSignOutBypass() {
  return null;
}

export const SettingsSignOut = clerkBypassEnabled
  ? SettingsSignOutBypass
  : SettingsSignOutWithClerk;
