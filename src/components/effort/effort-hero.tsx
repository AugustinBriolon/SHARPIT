import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import { softTintFromQualityClass } from '@/lib/presentation/physio-plate-tint';

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
  onDateChange,
  onPreviousDay,
  onNextDay,
  isToday,
  maxDate,
  confidencePct,
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
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
  maxDate?: Date;
  confidencePct?: number | null;
}) {
  let actionLine: string | null = null;
  if (estimatedDaysToFresh != null && estimatedDaysToFresh > 0) {
    actionLine = `Frais dans ${estimatedDaysToFresh === 1 ? '1 jour' : `${estimatedDaysToFresh} jours`}`;
  } else if (fatigueTypeLabel && fatigueType !== 'UNDETERMINED') {
    actionLine = `Type · ${fatigueTypeLabel}`;
  } else if (consecutiveDays > 0) {
    actionLine = `${consecutiveDays} j d'accumulation`;
  } else if (performancePercent != null && performancePercent < 100) {
    actionLine = `Capacité ~${performancePercent} %`;
  }

  const tssLine =
    dailyLoad > 0 ? `${dailyLoad} TSS cumulés aujourd'hui` : "0 TSS cumulés aujourd'hui";

  return (
    <PhysioDrillDownHero
      confidencePct={confidencePct}
      date={date}
      footer={actionLine ? tssLine : undefined}
      headline={strainStatusLabel}
      headlineClassName={strainStatusClassName}
      isToday={isToday}
      maxDate={maxDate}
      panelClassName={softTintFromQualityClass(strainStatusClassName)}
      quickReadCaption={actionLine ?? tssLine}
      quickReadLabel="charge du jour"
      quickReadSuffix={` / ${DAILY_STRAIN_GAUGE_MAX}`}
      quickReadValue={strainScore != null ? strainScore.toFixed(1) : '—'}
      railCaption="faible vers élevée"
      railMax={DAILY_STRAIN_GAUGE_MAX}
      railValue={strainScore}
      subline={strainSubtitle}
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
