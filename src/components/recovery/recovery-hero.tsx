import { DrillDownHero } from '@/components/today/drill-down/hero';

export function RecoveryHero({
  date,
  readinessScore,
  signal,
  limiterLabel,
  estimatedRecoveryDays,
  isCalibrating,
  availableDimCount,
  onDateChange,
  onPreviousDay,
  onNextDay,
  isToday,
  maxDate,
}: {
  date: Date;
  readinessScore: number | null;
  signal: { label: string; qualityClass: string; arrow: string };
  limiterLabel: string | null;
  estimatedRecoveryDays: number | null;
  isCalibrating: boolean;
  availableDimCount: number;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
  maxDate?: Date;
}) {
  return (
    <DrillDownHero
      colorMode="dynamic"
      date={date}
      format="percent"
      isToday={isToday}
      maxDate={maxDate}
      primaryCaption="score récupération"
      primaryValue={readinessScore != null ? `${readinessScore}` : null}
      score={readinessScore}
      statusClassName={signal.qualityClass}
      statusLabel={signal.label}
      badge={
        isCalibrating ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Calibration · {availableDimCount}/4 signaux
          </span>
        ) : undefined
      }
      meta={
        <>
          {limiterLabel && (
            <p>
              Facteur limitant : <span className="text-foreground font-medium">{limiterLabel}</span>
            </p>
          )}
          {estimatedRecoveryDays != null && estimatedRecoveryDays > 0 && (
            <p>
              Récupération estimée dans{' '}
              <span className="text-foreground font-medium">
                {estimatedRecoveryDays === 1 ? '1 jour' : `${estimatedRecoveryDays} jours`}
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
