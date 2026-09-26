import { Check } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ConnectGarminHeader } from '@/components/integrations/connect-garmin/connect-garmin-header';
import {
  CONNECT_GARMIN_PATH,
  garminHandoffCopy,
  type GarminHandoffStatus,
} from '@sharpit/app/lib/integrations/garmin/garmin-connect-handoff';
import { RISK_TONE, STATUS_SURFACE } from '@sharpit/app/lib/presentation/coaching/status-surface';
import { cn } from '@sharpit/app/lib/utils';

/**
 * Where the handoff ends. On iOS the ASWebAuthenticationSession closes as soon as this
 * URL loads, so the athlete mostly sees it in a plain browser.
 */
export function ConnectGarminOutcome({ status }: { status: GarminHandoffStatus }) {
  const copy = garminHandoffCopy(status);
  return (
    <>
      <ConnectGarminHeader title="Garmin" />
      <div
        aria-live="polite"
        role="status"
        className={cn(
          'analysis-panel rounded-analysis-lg flex flex-col items-center gap-3 px-5 py-8 text-center',
          copy.tone === 'done' && STATUS_SURFACE.doneSoft,
          copy.tone === 'risk' && RISK_TONE.bgClass,
        )}
      >
        {copy.tone === 'done' ? (
          <span
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-full border',
              STATUS_SURFACE.doneBadge,
            )}
          >
            <Check className="size-4" strokeWidth={2} aria-hidden />
          </span>
        ) : null}
        <div className="space-y-1">
          <p
            className={cn(
              'text-section-title text-foreground',
              copy.tone === 'risk' && RISK_TONE.colorClass,
            )}
          >
            {copy.title}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
            {copy.description}
          </p>
        </div>
      </div>
      {copy.canRetry ? (
        <a className={cn(buttonVariants({ size: 'lg' }), 'w-full')} href={CONNECT_GARMIN_PATH}>
          Réessayer
        </a>
      ) : null}
    </>
  );
}
