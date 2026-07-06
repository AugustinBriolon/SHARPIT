import { DrillDownHero } from '@/components/today/drill-down/hero';
import { fatigueIndexToWhoopStrain, WHOOP_STRAIN_MAX } from '@/lib/strain';
import { mapFatigueTypeToLabel, type FatigueType } from '@/lib/today-mapping';

export function EffortHero({
  date,
  fatigueIndex,
  signal,
  fatigueType,
  performancePercent,
  consecutiveDays,
  estimatedDaysToFresh,
}: {
  date: Date;
  fatigueIndex: number | null;
  signal: { label: string; qualityClass: string; arrow: string };
  fatigueType: FatigueType | string;
  performancePercent: number | null;
  consecutiveDays: number;
  estimatedDaysToFresh: number | null;
}) {
  const fatigueTypeLabel = mapFatigueTypeToLabel(fatigueType as FatigueType);
  const strainScore = fatigueIndexToWhoopStrain(fatigueIndex);

  return (
    <DrillDownHero
      colorMode="strain"
      date={date}
      format="strain"
      max={WHOOP_STRAIN_MAX}
      primaryCaption="charge d'effort"
      score={strainScore}
      statusArrow={signal.arrow}
      statusClassName={signal.qualityClass}
      statusLabel={signal.label}
      meta={
        <>
          {fatigueTypeLabel && fatigueType !== 'UNDETERMINED' && (
            <p>
              Type : <span className="text-foreground font-medium">{fatigueTypeLabel}</span>
            </p>
          )}
          {performancePercent != null && performancePercent < 100 && (
            <p>
              Capacité : <span className="text-foreground font-medium">~{performancePercent}%</span>
            </p>
          )}
          {consecutiveDays > 0 && (
            <p className="font-medium text-amber-600">
              {consecutiveDays}j d&apos;accumulation consécutifs
            </p>
          )}
          {estimatedDaysToFresh != null && estimatedDaysToFresh > 0 && (
            <p>
              Frais dans{' '}
              <span className="text-foreground font-medium">
                {estimatedDaysToFresh === 1 ? '1 jour' : `${estimatedDaysToFresh} jours`}
              </span>
            </p>
          )}
        </>
      }
    />
  );
}
