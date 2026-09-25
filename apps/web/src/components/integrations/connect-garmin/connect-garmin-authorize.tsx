'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Loader2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ConnectGarminHeader } from '@/components/integrations/connect-garmin/connect-garmin-header';
import {
  createGarminSsoMessageHandler,
  GarminSsoConnectingPlate,
  type GarminSsoPhase,
} from '@/components/settings/integrations/garmin-browser-sso-parts';
import { useIosIframeFocusZoomGuard } from '@/hooks/use-ios-iframe-focus-zoom-guard';
import { buildGarminBrowserSsoUrl } from '@/lib/integrations/garmin/garmin-browser-sso-shared';
import {
  garminHandoffCallbackPath,
  parseGarminHandoffStatus,
} from '@/lib/integrations/garmin/garmin-connect-handoff';
import { cn } from '@/lib/utils';

/**
 * A full navigation, never a client-side one: the iOS ASWebAuthenticationSession only
 * notices the callback URL when the page actually loads it.
 */
function leaveTo(url: string) {
  window.location.assign(url);
}

const noSubscribe = () => () => {};

function GarminSignInFrame({
  iframeSrc,
  iframeRef,
}: {
  iframeSrc: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const [iframeReady, setIframeReady] = useState(false);
  return (
    <div className="analysis-panel-alt rounded-analysis-lg overflow-hidden">
      <div className="bg-analysis-surface relative h-[min(26rem,62dvh)] overflow-hidden">
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
            <p className="text-muted-foreground text-sm">Ouverture de Garmin…</p>
          </div>
        ) : null}
        {iframeSrc ? (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="Formulaire de connexion Garmin"
            className={cn(
              'bg-analysis-surface h-[28rem] w-full border-0 transition-opacity duration-200',
              iframeReady ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={() => setIframeReady(true)}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Native Garmin handoff, step 3 — Garmin's embedded sign-in. The ticket it posts back is
 * exchanged by `/api/garmin/sso-callback`, which checks the signed state cookie; every
 * outcome then lands on the callback URL.
 */
export function ConnectGarminAuthorize() {
  const [phase, setPhase] = useState<GarminSsoPhase>('form');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const exchanging = useRef(false);

  // Empty on the server: Garmin needs this page's own origin to post the ticket back.
  const iframeSrc = useSyncExternalStore(
    noSubscribe,
    () => buildGarminBrowserSsoUrl(window.location.origin),
    () => '',
  );

  useIosIframeFocusZoomGuard(iframeRef, phase === 'form' && Boolean(iframeSrc));

  useEffect(() => {
    const onMessage = createGarminSsoMessageHandler({
      exchanging,
      setPhase,
      setErrorStatus: (status) => {
        if (status) {
          leaveTo(garminHandoffCallbackPath(parseGarminHandoffStatus(status)));
        }
      },
      onSuccess: leaveTo,
    });
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (phase !== 'form') {
    return <GarminSsoConnectingPlate />;
  }

  return (
    <>
      <ConnectGarminHeader
        lead="Identifie-toi sur Garmin. Ton mot de passe reste chez Garmin."
        title="Autoriser Garmin"
      />
      <GarminSignInFrame iframeRef={iframeRef} iframeSrc={iframeSrc} />
      <a
        className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'w-full')}
        href={garminHandoffCallbackPath('cancelled')}
      >
        Annuler
      </a>
    </>
  );
}
