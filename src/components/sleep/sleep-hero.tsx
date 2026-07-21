import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import { formatClock } from '@/lib/sleep';
import { softTintFromQualityClass } from '@/lib/presentation/physio-plate-tint';
import { formatSleepDuration } from '@/lib/sleep-scoring';

export function SleepHero({
  date,
  sleepScore,
  adequacyDisplay,
  totalSleepMin,
  bedtimeMin,
  wakeMin,
  actionLine,
  onDateChange,
  onPreviousDay,
  onNextDay,
  isToday,
  maxDate,
  confidencePct,
  loading = false,
}: {
  date: Date;
  sleepScore: number | null;
  adequacyDisplay: { label: string; colorClass: string };
  totalSleepMin: number | null;
  bedtimeMin: number | null;
  wakeMin: number | null;
  /** Sleep-specific action under the verdict (coucher / dette). */
  actionLine?: string | null;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
  maxDate?: Date;
  confidencePct?: number | null;
  loading?: boolean;
}) {
  const subtitle =
    !loading && bedtimeMin != null && wakeMin != null
      ? `${formatClock(bedtimeMin)} → ${formatClock(wakeMin)}`
      : null;

  return (
    <PhysioDrillDownHero
      confidencePct={confidencePct}
      date={date}
      headline={adequacyDisplay.label}
      headlineClassName={adequacyDisplay.colorClass}
      isToday={isToday}
      loading={loading}
      maxDate={maxDate}
      panelClassName={loading ? undefined : softTintFromQualityClass(adequacyDisplay.colorClass)}
      quickReadCaption={loading ? undefined : (actionLine ?? undefined)}
      quickReadLabel="durée de sommeil"
      quickReadValue={totalSleepMin != null ? formatSleepDuration(totalSleepMin) : '—'}
      railCaption="insuffisant vers récupérant"
      railValue={sleepScore}
      subline={subtitle}
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
