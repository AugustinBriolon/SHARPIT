import {
  DrillDownAlertSection,
  type DrillDownAlert,
} from '@/components/today/drill-down/alert-section';
import { MedicalDisclaimerNote } from '@/components/ui/instruments/medical-disclaimer-note';
import {
  ATYPICAL_RECOVERY_SIGNAL_PREFIX,
  ILLNESS_SYMPTOM_ADVICE_FR,
} from '@/lib/copy/medical-disclaimer';

/**
 * Only what breaks the routine.
 *
 * The dissonance signal used to sit under three rows reading "Autonome · Équilibre
 * normal", which named a state without saying what to do with it. It is a genuine
 * exception — the body and the feeling disagreeing — so it is stated as one, in a
 * sentence that resolves which of the two to trust.
 *
 * Illness-like patterns are framed as atypical recovery signals (not a diagnosis);
 * the medical disclaimer stays visible whenever that clinical-sounding surface appears.
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
  const alerts: DrillDownAlert[] = [];

  if (overreaching) {
    alerts.push({
      colorClass: overreaching.colorClass,
      label: overreaching.label,
      prefix: 'Surmenage',
    });
  }

  if (illness) {
    alerts.push({
      colorClass: illness.colorClass,
      label: illness.label,
      prefix: ATYPICAL_RECOVERY_SIGNAL_PREFIX,
      detail: ILLNESS_SYMPTOM_ADVICE_FR,
      tone: 'risk',
    });
  }

  if (dissonanceDetected) {
    alerts.push({
      colorClass: 'text-signal-caution',
      label:
        'tu te sens mieux que ce que disent tes marqueurs. Suis les marqueurs aujourd’hui, pas la sensation.',
      prefix: 'Sensations et mesures divergent',
    });
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <DrillDownAlertSection alerts={alerts} />
      {illness ? <MedicalDisclaimerNote /> : null}
    </div>
  );
}
