'use client';

import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  GARMIN_SSO_MESSAGE_ORIGIN,
  parseGarminSsoPostMessage,
} from '@/lib/integrations/garmin/garmin-browser-sso-shared';
import { RISK_TONE, STATUS_SURFACE } from '@/lib/presentation/coaching/status-surface';
import { cn } from '@/lib/utils';

export type GarminSsoPhase = 'form' | 'connecting' | 'success' | 'error';

type TicketExchangeResult =
  { ok: true; redirectTo: string } | { ok: false; status: string | undefined };

export async function exchangeGarminSsoTicket(ticket: string): Promise<TicketExchangeResult> {
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
    return { ok: false, status: data?.status };
  }
  return { ok: true, redirectTo: data.redirectTo };
}

export function createGarminSsoMessageHandler(options: {
  exchanging: React.MutableRefObject<boolean>;
  setPhase: (phase: GarminSsoPhase) => void;
  setErrorStatus: (status: string | undefined) => void;
  onSuccess: (redirectTo: string) => void;
}) {
  return function onMessage(event: MessageEvent) {
    if (event.origin !== GARMIN_SSO_MESSAGE_ORIGIN) {
      return;
    }
    const ticket = parseGarminSsoPostMessage(event.data);
    if (!ticket || options.exchanging.current) {
      return;
    }
    options.exchanging.current = true;
    options.setPhase('connecting');
    options.setErrorStatus(undefined);

    void (async () => {
      try {
        const result = await exchangeGarminSsoTicket(ticket);
        if (!result.ok) {
          options.setPhase('error');
          options.setErrorStatus(result.status);
          options.exchanging.current = false;
          return;
        }
        options.onSuccess(result.redirectTo);
      } catch {
        options.setPhase('error');
        options.setErrorStatus('error');
        options.exchanging.current = false;
      }
    })();
  };
}

export function GarminSsoConnectingPlate() {
  return (
    <StatusPlate
      description="Échange du ticket de session — ne ferme pas cette page."
      icon={<Loader2 className="text-primary size-5 animate-spin" strokeWidth={1.75} aria-hidden />}
      title="Connexion Garmin…"
    />
  );
}

export function GarminSsoSuccessPlate() {
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

export function GarminSsoErrorPanel({
  err,
  retryHref,
  backHref,
}: {
  err: { title: string; description: string };
  retryHref: string;
  backHref: string;
}) {
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
