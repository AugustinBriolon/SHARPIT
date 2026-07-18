import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { cn } from '@/lib/utils';

export type DrillDownAlert = {
  prefix: string;
  label: string;
  colorClass: string;
};

export function DrillDownAlertSection({ alerts }: { alerts: DrillDownAlert[] }) {
  if (!alerts.length) return null;

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>{alerts.length > 1 ? 'Alertes' : 'Alerte'}</DrillDownSectionLabel>
      {alerts.map((alert, i) => (
        <p
          key={`${alert.prefix}-${alert.label}`}
          className={cn(
            'annotation-clinical text-sm font-medium',
            alert.colorClass,
            i > 0 && 'mt-2',
          )}
        >
          {alert.prefix} — {alert.label}
        </p>
      ))}
    </DrillDownSectionCard>
  );
}
