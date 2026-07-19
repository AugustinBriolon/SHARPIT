import { PhysioDomainWhy } from '@/components/today/drill-down/physio-domain-why';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
import { formatDuration } from '@/lib/sleep';
import { formatSleepDuration } from '@/lib/sleep-scoring';

/**
 * Sleep why — night-first narrative; training decision demoted to expand.
 */
export function SleepWhyBlock({
  debt7Min,
  targetDeltaMin,
  restorativeRatio,
  globalDecision,
}: {
  debt7Min: number | null;
  targetDeltaMin: number | null;
  restorativeRatio: number | null;
  globalDecision: GlobalDecisionContext;
}) {
  let primary: string | null = null;
  if (debt7Min != null && debt7Min > 30) {
    primary = `Dette 7 jours ${formatDuration(debt7Min)} — à résorber sur les prochaines nuits.`;
  } else if (targetDeltaMin != null && targetDeltaMin < 0) {
    primary = `${formatSleepDuration(Math.abs(targetDeltaMin))} sous l’objectif cette nuit.`;
  } else if (restorativeRatio != null && restorativeRatio < 40) {
    primary = `Part restauratrice à ${restorativeRatio} % — profondeur / paradoxe à surveiller.`;
  } else if (targetDeltaMin != null && targetDeltaMin >= 0) {
    primary = 'Durée dans la cible — maintenir la régularité du coucher.';
  }

  return <PhysioDomainWhy globalDecision={globalDecision} label="Cette nuit" primary={primary} />;
}
