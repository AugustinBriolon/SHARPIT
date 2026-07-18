import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import { formatClock } from '@/lib/sleep';
import { formatSleepDuration } from '@/lib/sleep-scoring';

export function SleepHero({
  date,
  sleepScore,
  adequacyDisplay,
  totalSleepMin,
  bedtimeMin,
  wakeMin,
  onDateChange,
  onPreviousDay,
  onNextDay,
  isToday,
  maxDate,
}: {
  date: Date;
  sleepScore: number | null;
  adequacyDisplay: { label: string; colorClass: string };
  totalSleepMin: number | null;
  bedtimeMin: number | null;
  wakeMin: number | null;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
  maxDate?: Date;
}) {
  const subtitle =
    bedtimeMin != null && wakeMin != null
      ? `${formatClock(bedtimeMin)} → ${formatClock(wakeMin)}`
      : null;

  return (
    <PhysioDrillDownHero
      date={date}
      headline={adequacyDisplay.label}
      headlineClassName={adequacyDisplay.colorClass}
      isToday={isToday}
      maxDate={maxDate}
      quickReadCaption="Temps de sommeil effectif sur la nuit analysée."
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
