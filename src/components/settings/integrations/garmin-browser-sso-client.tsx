'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { buttonVariants } from '@/components/ui/button';
import {
  buildGarminBrowserSsoUrl,
  GARMIN_SSO_MESSAGE_ORIGIN,
  parseGarminSsoPostMessage,
} from '@/lib/integrations/garmin/garmin-browser-sso-shared';
import { cn } from '@/lib/utils';

type Phase = 'ready' | 'exchanging' | 'error';

export function GarminBrowserSsoClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('ready');
  const [error, setError] = useState<string | null>(null);
  const exchanging = useRef(false);

  const iframeSrc = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return buildGarminBrowserSsoUrl(window.location.origin);
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== GARMIN_SSO_MESSAGE_ORIGIN) {
        return;
      }
      const ticket = parseGarminSsoPostMessage(event.data);
      if (!ticket || exchanging.current) {
        return;
      }
      exchanging.current = true;
      setPhase('exchanging');
      setError(null);

      void (async () => {
        try {
          const response = await fetch('/api/garmin/sso-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket }),
          });
          const data = (await response.json().catch(() => null)) as {
            redirectTo?: string;
            status?: string;
            error?: string;
          } | null;
          if (!response.ok || !data?.redirectTo) {
            setPhase('error');
            setError(
              data?.status === 'invalid_state'
                ? 'Session expirée — relance la connexion depuis Applications.'
                : 'Échange des jetons Garmin impossible. Réessaie ou utilise l’import avancé.',
            );
            exchanging.current = false;
            return;
          }
          router.replace(data.redirectTo);
        } catch {
          setPhase('error');
          setError('Connexion interrompue. Réessaie.');
          exchanging.current = false;
        }
      })();
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings/integrations" label="Applications" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Applications</p>
        <h1 className="text-page-title mt-1">Connecter Garmin</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Connecte-toi sur le site Garmin ci-dessous. Le mot de passe reste chez Garmin — Sharpit
          reçoit uniquement un ticket de session.
        </p>
      </StickyHeader>

      {phase === 'exchanging' ? (
        <p className="text-muted-foreground text-sm" role="status">
          Finalisation de la connexion…
        </p>
      ) : null}

      {error ? (
        <div className="space-y-3">
          <p aria-live="assertive" className="text-destructive text-sm">
            {error}
          </p>
          <Link
            className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex')}
            href="/api/garmin/connect?returnTo=/settings/integrations"
          >
            Réessayer
          </Link>
        </div>
      ) : null}

      {phase !== 'exchanging' ? (
        <div className="border-border bg-background overflow-hidden rounded-2xl border">
          {iframeSrc ? (
            <iframe
              className="bg-background h-[min(70vh,640px)] w-full"
              src={iframeSrc}
              title="Connexion Garmin Connect"
            />
          ) : (
            <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
              Chargement…
            </div>
          )}
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs leading-relaxed">
        Sur Safari, les cookies tiers peuvent bloquer l’iframe Garmin. Utilise Chrome sur téléphone,
        ou l’import avancé (jetons DI) depuis un ordinateur.
      </p>
    </div>
  );
}
