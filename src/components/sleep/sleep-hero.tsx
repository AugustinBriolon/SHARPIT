import { DrillDownHero } from '@/components/today/drill-down/hero';
import { formatClock } from '@/lib/sleep';
import { formatSleepDuration } from '@/lib/sleep-scoring';
import { mapScoreToColorClass } from '@/lib/today-mapping';
import { cn } from '@/lib/utils';

export function SleepHero({
  date,
  sleepScore,
  adequacyDisplay,
  totalSleepMin,
  bedtimeMin,
  wakeMin,
  garminScore,
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
  garminScore: number | null;
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
    <DrillDownHero
      colorMode="neutral"
      date={date}
      format="percent"
      isToday={isToday}
      maxDate={maxDate}
      primaryCaption="temps de sommeil"
      primaryValue={totalSleepMin != null ? formatSleepDuration(totalSleepMin) : null}
      score={sleepScore}
      statusClassName={adequacyDisplay.colorClass}
      statusLabel={adequacyDisplay.label}
      subtitle={subtitle}
      badge={
        garminScore != null ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] dark:bg-slate-800">
            Garmin
            <span className={cn('font-semibold tabular-nums', mapScoreToColorClass(garminScore))}>
              {garminScore}
            </span>
          </span>
        ) : undefined
      }
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
