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
  const footerLines = [
    limiterLabel ? `Facteur limitant : ${limiterLabel}` : null,
    estimatedRecoveryDays != null && estimatedRecoveryDays > 0
      ? `Récupération estimée dans ${
          estimatedRecoveryDays === 1 ? '1 jour' : `${estimatedRecoveryDays} jours`
        }`
      : null,
  ].filter(Boolean);

  return (
    <PhysioDrillDownHero
      date={date}
      headline={signal.label}
      headlineClassName={signal.qualityClass}
      isToday={isToday}
      maxDate={maxDate}
      quickReadCaption="Score de récupération utilisé comme repère central du jour."
      quickReadLabel="score récupération"
      quickReadSuffix="%"
      quickReadValue={readinessScore != null ? String(Math.round(readinessScore)) : '—'}
      railValue={readinessScore}
      badge={
        isCalibrating ? (
          <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-[10px] font-medium">
            Calibration · {availableDimCount}/4 signaux
          </span>
        ) : undefined
      }
      footer={
        footerLines.length > 0 ? (
          <div className="space-y-1">
            {footerLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : undefined
      }
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
