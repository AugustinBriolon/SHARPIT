import { AlertTriangle } from 'lucide-react';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { cn } from '@/lib/utils';

export type AlertTone = 'caution' | 'risk';

export type DrillDownAlert = {
  prefix: string;
  label: string;
  colorClass: string;
  /** Drives the surface. Defaults to caution — risk claims the louder ground. */
  tone?: AlertTone;
};

const SURFACE: Record<AlertTone, string> = {
  caution: 'border-signal-caution/35 bg-signal-caution/8',
  risk: 'border-signal-risk/40 bg-signal-risk/10',
};

/**
 * The exceptions, on ground of their own.
 *
 * Coloured text on the same white card as everything else asks the athlete to
 * notice a hue at a glance — and hue is exactly the channel that fails on a dim
 * screen, in sunlight, or for a colour-blind reader. The alert now sits on a
 * tinted panel with its own rule and a mark, so it separates by shape and by
 * position before any colour is read at all.
 */
export function DrillDownAlertSection({ alerts }: { alerts: DrillDownAlert[] }) {
  if (!alerts.length) {
    return null;
  }

  const tone: AlertTone = alerts.some((alert) => alert.tone === 'risk') ? 'risk' : 'caution';

  return (
    <DrillDownSectionCard className={cn('border', SURFACE[tone])}>
      <div className="flex items-center gap-1.5">
        <AlertTriangle
          className={cn(
            'size-3.5 shrink-0',
            tone === 'risk' ? 'text-signal-risk' : 'text-signal-caution',
          )}
          aria-hidden
        />
        <DrillDownSectionLabel className="mb-0">
          {alerts.length > 1 ? 'Alertes' : 'Alerte'}
        </DrillDownSectionLabel>
      </div>

      <ul className="mt-3 space-y-2" role="list">
        {alerts.map((alert) => (
          <li key={`${alert.prefix}-${alert.label}`}>
            <p
              className={cn('annotation-clinical text-sm font-medium', alert.colorClass)}
              role="status"
            >
              <span className="font-semibold">{alert.prefix}</span>
              <span aria-hidden> — </span>
              {alert.label}
            </p>
          </li>
        ))}
      </ul>
    </DrillDownSectionCard>
  );
}
