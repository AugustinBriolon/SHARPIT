import { PhysioDomainWhy } from '@/components/today/drill-down/physio-domain-why';
import { formatDuration } from '@/lib/sleep/sleep';
import { formatSleepDuration } from '@/lib/sleep/sleep-scoring';

/**
 * Sleep why — night-first narrative; training decision demoted to expand.
 */
export function SleepWhyBlock({
  debt7Min,
  targetDeltaMin,
  restorativeRatio,
  loading = false,
}: {
  debt7Min: number | null;
  targetDeltaMin: number | null;
  restorativeRatio: number | null;
  loading?: boolean;
}) {
  if (loading) {
    return <PhysioDomainWhy label="Cette nuit" primary={null} loading />;
  }

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

  return <PhysioDomainWhy label="Cette nuit" primary={primary} />;
}
