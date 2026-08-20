import { DrillDownAlertSection } from '@/components/today/drill-down/alert-section';

export function RecoveryAlertsSection({
  overreaching,
  illness,
}: {
  overreaching?: { label: string; colorClass: string };
  illness?: { label: string; colorClass: string };
}) {
  const alerts = [
    overreaching && {
      colorClass: overreaching.colorClass,
      label: overreaching.label,
      prefix: 'Surmenage',
    },
    illness && {
      colorClass: illness.colorClass,
      label: illness.label,
      prefix: 'Activation immunitaire',
    },
  ].filter((alert): alert is NonNullable<typeof alert> => Boolean(alert));

  return <DrillDownAlertSection alerts={alerts} />;
}
