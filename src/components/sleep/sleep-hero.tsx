import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import { formatClock } from '@/lib/sleep/sleep';

export function SleepHero({
  date,
  sleepScore,
  adequacyDisplay,
  bedtimeMin,
  wakeMin,
  insightLine,
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
  bedtimeMin: number | null;
  wakeMin: number | null;
  /** Coach reading under the verdict (night insight). */
  insightLine?: string | null;
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
      eyebrow="Sommeil"
      headline={adequacyDisplay.label}
      headlineClassName={adequacyDisplay.colorClass}
      isToday={isToday}
      loading={loading}
      maxDate={maxDate}
      quickReadCaption={loading ? undefined : (insightLine ?? undefined)}
      quickReadLabel="score sommeil"
      quickReadSuffix="/ 100"
      quickReadValue={sleepScore != null ? String(sleepScore) : '—'}
      railCaption="insuffisant vers récupérant"
      railValue={sleepScore}
      subline={subtitle}
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
