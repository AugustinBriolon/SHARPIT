import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import { softTintFromQualityClass } from '@/lib/presentation/physio-plate-tint';

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
  confidencePct,
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
  confidencePct?: number | null;
}) {
  const actionLine = limiterLabel ? `Limité par · ${limiterLabel}` : null;
  const recoveryEta =
    estimatedRecoveryDays != null && estimatedRecoveryDays > 0
      ? `Récupération estimée dans ${
          estimatedRecoveryDays === 1 ? '1 jour' : `${estimatedRecoveryDays} jours`
        }`
      : null;

  return (
    <PhysioDrillDownHero
      confidencePct={confidencePct}
      date={date}
      footer={recoveryEta ?? undefined}
      headline={signal.label}
      headlineClassName={signal.qualityClass}
      isToday={isToday}
      maxDate={maxDate}
      panelClassName={softTintFromQualityClass(signal.qualityClass)}
      quickReadCaption={actionLine}
      quickReadLabel="score récupération"
      quickReadSuffix="%"
      quickReadValue={readinessScore != null ? String(Math.round(readinessScore)) : '—'}
      railValue={readinessScore}
      badge={
        isCalibrating ? (
          <span className="text-label text-muted-foreground">
            Calibration · {availableDimCount}/4
          </span>
        ) : undefined
      }
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
