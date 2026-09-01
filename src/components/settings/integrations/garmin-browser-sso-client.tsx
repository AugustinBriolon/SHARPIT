'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { IntegrationLogo } from '@/components/settings/integrations/logos';
import { buttonVariants } from '@/components/ui/button';
import { useIosIframeFocusZoomGuard } from '@/hooks/use-ios-iframe-focus-zoom-guard';
import {
  buildGarminBrowserSsoUrl,
  GARMIN_SSO_MESSAGE_ORIGIN,
  parseGarminSsoPostMessage,
} from '@/lib/integrations/garmin/garmin-browser-sso-shared';
import { RISK_TONE, STATUS_SURFACE } from '@/lib/presentation/status-surface';
import { cn } from '@/lib/utils';

type Phase = 'form' | 'connecting' | 'success' | 'error';

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
  setPhase: (phase: Phase) => void,
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
    function onMessage(event: MessageEvent) {
      if (event.origin !== GARMIN_SSO_MESSAGE_ORIGIN) {
        return;
      }
      const ticket = parseGarminSsoPostMessage(event.data);
      if (!ticket || exchanging.current) {
        return;
      }
      exchanging.current = true;
      setPhase('connecting');
      setErrorStatus(undefined);

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
          } | null;
          if (!response.ok || !data?.redirectTo) {
            setPhase('error');
            setErrorStatus(data?.status);
            exchanging.current = false;
            return;
          }
          setPhase('success');
          successTimer.current = setTimeout(() => {
            router.replace(data.redirectTo!);
          }, SUCCESS_HOLD_MS);
        } catch {
          setPhase('error');
          setErrorStatus('error');
          exchanging.current = false;
        }
      })();
    }

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
  phase: Phase;
  err: { title: string; description: string };
  retryHref: string;
  backHref: string;
  iframeSrc: string;
  iframeReady: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onIframeLoad: () => void;
}) {
  if (phase === 'connecting') {
    return (
      <StatusPlate
        description="Échange du ticket de session — ne ferme pas cette page."
        title="Connexion Garmin…"
        icon={
          <Loader2 className="text-primary size-5 animate-spin" strokeWidth={1.75} aria-hidden />
        }
      />
    );
  }
  if (phase === 'success') {
    return (
      <StatusPlate
        className={STATUS_SURFACE.doneSoft}
        description="Redirection vers tes applications…"
        title="Garmin connecté"
        icon={
          <span
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-full border',
              STATUS_SURFACE.doneBadge,
            )}
          >
            <Check className="size-4" strokeWidth={2} aria-hidden />
          </span>
        }
      />
    );
  }
  if (phase === 'error') {
    return (
      <div
        className={cn('analysis-panel rounded-analysis-lg space-y-4 px-5 py-5', RISK_TONE.bgClass)}
      >
        <div className="space-y-1">
          <p className={cn('text-sm font-medium', RISK_TONE.colorClass)}>{err.title}</p>
          <p className="text-muted-foreground text-xs leading-relaxed sm:text-[13px]">
            {err.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={cn(buttonVariants(), 'w-full sm:w-auto')} href={retryHref}>
            Réessayer
          </a>
          <Link
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}
            href={backHref}
          >
            Retour
          </Link>
        </div>
      </div>
    );
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
  const [phase, setPhase] = useState<Phase>('form');
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

function StatusPlate({
  title,
  description,
  icon,
  className,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-live="polite"
      role="status"
      className={cn(
        'analysis-panel rounded-analysis-lg flex flex-col items-center gap-3 px-5 py-10 text-center',
        className,
      )}
    >
      {icon}
      <div className="space-y-1">
        <p className="text-section-title text-foreground">{title}</p>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/** Exported for tests — hold duration before leaving success interstitial. */
export { SUCCESS_HOLD_MS };
