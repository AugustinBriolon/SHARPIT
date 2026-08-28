import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';

function buildActionLine({
  loading,
  intensityLabel,
  limiterLabel,
}: {
  loading: boolean;
  intensityLabel: string;
  limiterLabel: string | null;
}): string | null {
  if (loading) {
    return null;
  }
  const intensity = intensityLabel?.trim() || null;
  if (intensity && limiterLabel) {
    return `${intensity} · limité par ${limiterLabel.toLowerCase()}`;
  }
  if (intensity) {
    return intensity;
  }
  if (limiterLabel) {
    return `Limité par · ${limiterLabel}`;
  }
  return null;
}

function buildRecoveryEta(loading: boolean, estimatedRecoveryDays: number | null): string | null {
  if (loading || estimatedRecoveryDays === null || estimatedRecoveryDays <= 0) {
    return null;
  }
  const daysLabel = estimatedRecoveryDays === 1 ? '1 jour' : `${estimatedRecoveryDays} jours`;
  return `Récupération estimée dans ${daysLabel}`;
}

function buildCalibrationBadge(
  loading: boolean,
  isCalibrating: boolean,
  availableDimCount: number,
) {
  if (loading || !isCalibrating) {
    return undefined;
  }
  return (
    <span className="text-label text-muted-foreground">Calibration · {availableDimCount}/4</span>
  );
}

export function RecoveryHero({
  date,
  readinessScore,
  signal,
  intensityLabel,
  limiterLabel,
  estimatedRecoveryDays,
  isCalibrating,
  availableDimCount,
  onDateChange,
  onPreviousDay,
  onNextDay,
  isToday,
  maxDate,
  minDate,
  confidencePct,
  loading = false,
}: {
  date: Date;
  readinessScore: number | null;
  signal: { label: string; qualityClass: string; arrow: string };
  intensityLabel: string;
  limiterLabel: string | null;
  estimatedRecoveryDays: number | null;
  isCalibrating: boolean;
  availableDimCount: number;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
  maxDate?: Date;
  minDate?: Date;
  confidencePct?: number | null;
  loading?: boolean;
}) {
  // The intensity to aim for used to live in a paragraph below the fold that the
  // athlete never read. It is the only actionable sentence on the screen, so it
  // rides the plate next to the limiter instead of forming a section of its own.
  const actionLine = buildActionLine({ loading, intensityLabel, limiterLabel });
  const recoveryEta = buildRecoveryEta(loading, estimatedRecoveryDays);
  const calibrationBadge = buildCalibrationBadge(loading, isCalibrating, availableDimCount);

  return (
    <PhysioDrillDownHero
      badge={calibrationBadge}
      confidencePct={confidencePct}
      date={date}
      eyebrow="Récupération"
      footer={recoveryEta ?? undefined}
      headline={signal.label}
      headlineClassName={signal.qualityClass}
      isToday={isToday}
      loading={loading}
      maxDate={maxDate}
      minDate={minDate}
      quickReadCaption={actionLine}
      quickReadLabel="score récupération"
      quickReadSuffix="%"
      quickReadValue={readinessScore !== null ? String(Math.round(readinessScore)) : '—'}
      railValue={readinessScore}
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
