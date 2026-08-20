import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';

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
  loading = false,
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
  loading?: boolean;
}) {
  const actionLine = !loading && limiterLabel ? `Limité par · ${limiterLabel}` : null;
  const recoveryEta =
    !loading && estimatedRecoveryDays != null && estimatedRecoveryDays > 0
      ? `Récupération estimée dans ${
          estimatedRecoveryDays === 1 ? '1 jour' : `${estimatedRecoveryDays} jours`
        }`
      : null;

  return (
    <PhysioDrillDownHero
      confidencePct={confidencePct}
      date={date}
      eyebrow="Récupération"
      footer={recoveryEta ?? undefined}
      headline={signal.label}
      headlineClassName={signal.qualityClass}
      isToday={isToday}
      loading={loading}
      maxDate={maxDate}
      quickReadCaption={actionLine}
      quickReadLabel="score récupération"
      quickReadSuffix="%"
      quickReadValue={readinessScore != null ? String(Math.round(readinessScore)) : '—'}
      railValue={readinessScore}
      badge={
        !loading && isCalibrating ? (
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
