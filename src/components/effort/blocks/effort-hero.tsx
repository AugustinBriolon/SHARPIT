'use client';

import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import { isExpertMode } from '@/lib/preferences/display-mode';
import { useDisplayMode } from '@/providers/display-mode-provider';

export function EffortHero({
  date,
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
  minDate,
  confidencePct,
  loading = false,
}: {
  date: Date;
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
  minDate?: Date;
  confidencePct?: number | null;
  loading?: boolean;
}) {
  const { mode } = useDisplayMode();
  let actionLine: string | null = null;
  if (!loading) {
    if (estimatedDaysToFresh != null && estimatedDaysToFresh > 0) {
      actionLine = `Frais dans ${estimatedDaysToFresh === 1 ? '1 jour' : `${estimatedDaysToFresh} jours`}`;
    } else if (consecutiveDays > 1) {
      actionLine = `${consecutiveDays} j d'accumulation`;
    } else if (performancePercent != null && performancePercent < 100) {
      actionLine = `Capacité ~${performancePercent} %`;
    } else if (fatigueTypeLabel && fatigueType !== 'UNDETERMINED') {
      actionLine = fatigueTypeLabel;
    }
  }

  return (
    <PhysioDrillDownHero
      confidencePct={confidencePct}
      date={date}
      eyebrow="Charge"
      headline={strainStatusLabel}
      headlineClassName={strainStatusClassName}
      isToday={isToday}
      loading={loading}
      maxDate={maxDate}
      minDate={minDate}
      quickReadCaption={loading ? undefined : (actionLine ?? undefined)}
      quickReadLabel="aujourd'hui"
      quickReadSuffix={isExpertMode(mode) ? ' TSS' : ''}
      quickReadValue={dailyLoad > 0 ? `${dailyLoad}` : '0'}
      railCaption="charge du jour"
      railMax={100}
      railValue={dailyLoad > 0 ? dailyLoad : null}
      subline={loading ? null : strainSubtitle || null}
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
