import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { cn } from '@/lib/utils';

export type DrillDownAlert = {
  prefix: string;
  label: string;
  colorClass: string;
};

export function DrillDownAlertSection({ alerts }: { alerts: DrillDownAlert[] }) {
  if (!alerts.length) return null;

  return (
    <DrillDownSectionCard className="border border-orange-500/20 bg-orange-500/5 ring-0">
      <EyebrowLabel className="mb-2" variant="alert">
        {alerts.length > 1 ? 'Alertes' : 'Alerte'}
      </EyebrowLabel>
      {alerts.map((alert, i) => (
        <p
          key={`${alert.prefix}-${alert.label}`}
          className={cn('text-sm font-medium', alert.colorClass, i > 0 && 'mt-1')}
        >
          {alert.prefix} — {alert.label}
        </p>
      ))}
    </DrillDownSectionCard>
  );
}
