import { DrillDownAlertSection } from '@/components/today/drill-down/alert-section';

export function EffortAlertsSection({
  overreaching,
}: {
  overreaching?: { label: string; colorClass: string };
}) {
  if (!overreaching) return null;

  return (
    <DrillDownAlertSection
      alerts={[
        {
          colorClass: overreaching.colorClass,
          label: overreaching.label,
          prefix: 'Surmenage fonctionnel',
        },
      ]}
    />
  );
}
