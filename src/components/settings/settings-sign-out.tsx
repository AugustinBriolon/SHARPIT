'use client';

import { SignOutButton } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAthleteNavIdentity } from '@/hooks/use-athlete-nav-identity';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';

/**
 * Ends the Clerk session. Hidden in demo (no real session) and while identity
 * is still resolving so we never flash a dead control.
 */
export function SettingsSignOut() {
  const isDemo = useIsDemoMode();
  const { isReady, email } = useAthleteNavIdentity();

  if (!isReady || isDemo) return null;

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
