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
      <ul className="space-y-2" role="list">
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
