import { DrillDownHero } from '@/components/today/drill-down/hero';

const DAILY_STRAIN_GAUGE_MAX = 21;

export function EffortHero({
  date,
  strainScore,
  dailyLoad,
  fatigueType,
  fatigueTypeLabel,
  performancePercent,
  consecutiveDays,
  estimatedDaysToFresh,
  strainSubtitle,
  strainStatusLabel,
  strainStatusClassName,
  strainStrokeColor,
  onDateChange,
  onPreviousDay,
  onNextDay,
  isToday,
  maxDate,
}: {
  date: Date;
  strainScore: number | null;
  dailyLoad: number;
  fatigueType: string;
  fatigueTypeLabel: string | null;
  performancePercent: number | null;
  consecutiveDays: number;
  estimatedDaysToFresh: number | null;
  strainSubtitle: string;
  strainStatusLabel: string;
  strainStatusClassName: string;
  strainStrokeColor: string;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
  maxDate?: Date;
}) {
  return (
    <DrillDownHero
      colorMode="neutral"
      date={date}
      format="strain"
      isToday={isToday}
      max={DAILY_STRAIN_GAUGE_MAX}
      maxDate={maxDate}
      primaryCaption={dailyLoad > 0 ? `${dailyLoad} TSS cumulés` : '0 TSS cumulés'}
      score={strainScore}
      statusClassName={strainStatusClassName}
      statusLabel={strainStatusLabel}
      strokeColor={strainStrokeColor}
      subtitle={strainSubtitle}
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
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
