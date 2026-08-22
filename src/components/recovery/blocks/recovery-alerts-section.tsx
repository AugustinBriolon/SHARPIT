import {
  DrillDownAlertSection,
  type DrillDownAlert,
} from '@/components/today/drill-down/alert-section';

/**
 * Only what breaks the routine.
 *
 * The dissonance signal used to sit under three rows reading "Autonome · Équilibre
 * normal", which named a state without saying what to do with it. It is a genuine
 * exception — the body and the feeling disagreeing — so it is stated as one, in a
 * sentence that resolves which of the two to trust.
 */
export function RecoveryAlertsSection({
  overreaching,
  illness,
  dissonanceDetected = false,
}: {
  overreaching?: { label: string; colorClass: string };
  illness?: { label: string; colorClass: string };
  dissonanceDetected?: boolean;
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
    dissonanceDetected && {
      colorClass: 'text-signal-caution',
      label:
        'tu te sens mieux que ce que disent tes marqueurs. Suis les marqueurs aujourd’hui, pas la sensation.',
      prefix: 'Sensations et mesures divergent',
    },
  ].filter((alert): alert is DrillDownAlert => typeof alert === 'object' && alert !== null);

  return <DrillDownAlertSection alerts={alerts} />;
}
