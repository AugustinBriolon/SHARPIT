import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';

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
}) {
  const footerLines = [
    fatigueTypeLabel && fatigueType !== 'UNDETERMINED' ? `Type : ${fatigueTypeLabel}` : null,
    performancePercent != null && performancePercent < 100
      ? `Capacité : ~${performancePercent} %`
      : null,
    consecutiveDays > 0 ? `${consecutiveDays} j d'accumulation consécutifs` : null,
    estimatedDaysToFresh != null && estimatedDaysToFresh > 0
      ? `Frais dans ${estimatedDaysToFresh === 1 ? '1 jour' : `${estimatedDaysToFresh} jours`}`
      : null,
  ].filter(Boolean);

  return (
    <PhysioDrillDownHero
      date={date}
      headline={strainStatusLabel}
      headlineClassName={strainStatusClassName}
      isToday={isToday}
      maxDate={maxDate}
      quickReadLabel="charge du jour"
      quickReadSuffix={` / ${DAILY_STRAIN_GAUGE_MAX}`}
      quickReadValue={strainScore != null ? strainScore.toFixed(1) : '—'}
      railCaption="faible vers élevée"
      railMax={DAILY_STRAIN_GAUGE_MAX}
      railValue={strainScore}
      subline={strainSubtitle}
      footer={
        footerLines.length > 0 ? (
          <div className="space-y-1">
            {footerLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : undefined
      }
      quickReadCaption={
        dailyLoad > 0 ? `${dailyLoad} TSS cumulés aujourd'hui` : "0 TSS cumulés aujourd'hui"
      }
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
