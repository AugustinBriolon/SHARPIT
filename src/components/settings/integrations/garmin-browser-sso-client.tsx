'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MobileBackLink } from '@/components/layout/header/mobile-back-link';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import {
  createGarminSsoMessageHandler,
  GarminSsoConnectingPlate,
  GarminSsoErrorPanel,
  GarminSsoSuccessPlate,
  type GarminSsoPhase,
} from '@/components/settings/integrations/garmin-browser-sso-parts';
import { IntegrationLogo } from '@/components/settings/integrations/logos';
import { useIosIframeFocusZoomGuard } from '@/hooks/use-ios-iframe-focus-zoom-guard';
import { buildGarminBrowserSsoUrl } from '@/lib/integrations/garmin/garmin-browser-sso-shared';
import { cn } from '@/lib/utils';

const SUCCESS_HOLD_MS = 900;
const DEFAULT_BACK = '/settings/integrations';

function backLabel(returnTo: string): string {
  if (returnTo === '/onboarding') {
    return 'Onboarding';
  }
  return 'Applications';
}

function errorCopy(status: string | undefined): { title: string; description: string } {
  if (status === 'invalid_state') {
    return {
      title: 'Session expirée',
      description: 'Relance la connexion depuis Applications pour obtenir un nouveau ticket.',
    };
  }
  if (status === 'denied') {
    return {
      title: 'Connexion refusée',
      description:
        'Garmin n’a pas renvoyé de ticket valide. Réessaie, ou utilise Chrome si Safari bloque l’iframe.',
    };
  }
  return {
    title: 'Connexion impossible',
    description:
      'L’échange du ticket a échoué. Réessaie, ou utilise l’import avancé (jetons DI) depuis un ordinateur.',
  };
}

function useGarminSsoTicketExchange(
  setPhase: (phase: GarminSsoPhase) => void,
  setErrorStatus: (status: string | undefined) => void,
) {
  const router = useRouter();
  const exchanging = useRef(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const onMessage = createGarminSsoMessageHandler({
      exchanging,
      setPhase,
      setErrorStatus,
      onSuccess: (redirectTo) => {
        setPhase('success');
        successTimer.current = setTimeout(() => {
          router.replace(redirectTo);
        }, SUCCESS_HOLD_MS);
      },
    });

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router, setErrorStatus, setPhase]);
}

function GarminSsoForm({
  iframeSrc,
  iframeReady,
  iframeRef,
  onIframeLoad,
}: {
  iframeSrc: string;
  iframeReady: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onIframeLoad: () => void;
}) {
  return (
    <>
      <div className="analysis-panel-alt rounded-analysis-lg overflow-hidden">
        <p className="text-label text-muted-foreground border-analysis-border/60 border-b px-4 py-2.5">
          Connexion sécurisée Garmin
        </p>
        <div className="bg-analysis-surface relative h-[min(22.5rem,58dvh)] overflow-hidden">
          {!iframeReady ? (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-4"
              role="status"
              aria-busy
            >
              <Loader2
                className="text-muted-foreground size-5 animate-spin"
                strokeWidth={1.75}
                aria-hidden
              />
              <p className="text-muted-foreground text-sm">Chargement de Garmin…</p>
            </div>
          ) : null}
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="Formulaire de connexion Garmin"
            className={cn(
              'bg-analysis-surface h-[28rem] w-full border-0 transition-opacity duration-200',
              iframeReady ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={onIframeLoad}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-center text-xs leading-relaxed">
        Sur Safari, les cookies tiers peuvent bloquer l’iframe. Préfère Chrome sur téléphone.
      </p>
    </>
  );
}

function GarminSsoPhaseBody({
  phase,
  err,
  retryHref,
  backHref,
  iframeSrc,
  iframeReady,
  iframeRef,
  onIframeLoad,
}: {
  phase: GarminSsoPhase;
  err: { title: string; description: string };
  retryHref: string;
  backHref: string;
  iframeSrc: string;
  iframeReady: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onIframeLoad: () => void;
}) {
  if (phase === 'connecting') {
    return <GarminSsoConnectingPlate />;
  }
  if (phase === 'success') {
    return <GarminSsoSuccessPlate />;
  }
  if (phase === 'error') {
    return <GarminSsoErrorPanel backHref={backHref} err={err} retryHref={retryHref} />;
  }
  if (!iframeSrc) {
    return null;
  }
  return (
    <GarminSsoForm
      iframeReady={iframeReady}
      iframeRef={iframeRef}
      iframeSrc={iframeSrc}
      onIframeLoad={onIframeLoad}
    />
  );
}

export function GarminBrowserSsoClient({ returnTo = DEFAULT_BACK }: { returnTo?: string }) {
  const [phase, setPhase] = useState<GarminSsoPhase>('form');
  const [errorStatus, setErrorStatus] = useState<string | undefined>();
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const iframeSrc = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return buildGarminBrowserSsoUrl(window.location.origin);
  }, []);

  const retryHref = `/api/garmin/connect?returnTo=${encodeURIComponent(returnTo)}`;
  const backHref = returnTo;

  useIosIframeFocusZoomGuard(iframeRef, phase === 'form' && Boolean(iframeSrc));
  useGarminSsoTicketExchange(setPhase, setErrorStatus);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <MobileBackLink href={backHref} label={backLabel(returnTo)} showOnDesktop />
      <StickyHeader>
        <div className="flex items-start gap-3">
          <IntegrationLogo className="size-11 shrink-0" id="garmin" />
          <div className="min-w-0 flex-1">
            <p className="text-label">Applications</p>
            <h1 className="text-page-title mt-1">Connecter Garmin</h1>
            {phase === 'form' ? (
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Identifie-toi sur Garmin sans quitter Sharpit. Le mot de passe reste chez Garmin.
              </p>
            ) : null}
          </div>
        </div>
      </StickyHeader>

      <GarminSsoPhaseBody
        backHref={backHref}
        err={errorCopy(errorStatus)}
        iframeReady={iframeReady}
        iframeRef={iframeRef}
        iframeSrc={iframeSrc}
        phase={phase}
        retryHref={retryHref}
        onIframeLoad={() => setIframeReady(true)}
      />
    </div>
  );
}

/** Exported for tests — hold duration before leaving success interstitial. */
export { SUCCESS_HOLD_MS };
