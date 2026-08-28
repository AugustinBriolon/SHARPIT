'use client';

import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import { isExpertMode } from '@/lib/preferences/display-mode';
import { useDisplayMode } from '@/providers/display-mode-provider';

function effortFreshnessLine(estimatedDaysToFresh: number | null): string | null {
  if (estimatedDaysToFresh === null || estimatedDaysToFresh <= 0) {
    return null;
  }
  return `Frais dans ${estimatedDaysToFresh === 1 ? '1 jour' : `${estimatedDaysToFresh} jours`}`;
}

function effortAccumulationLine(consecutiveDays: number): string | null {
  if (consecutiveDays <= 1) {
    return null;
  }
  return `${consecutiveDays} j d'accumulation`;
}

function effortCapacityLine(performancePercent: number | null): string | null {
  if (performancePercent === null || performancePercent >= 100) {
    return null;
  }
  return `Capacité ~${performancePercent} %`;
}

function effortFatigueLine(fatigueTypeLabel: string | null, fatigueType: string): string | null {
  if (!fatigueTypeLabel || fatigueType === 'UNDETERMINED') {
    return null;
  }
  return fatigueTypeLabel;
}

function effortActionLine(options: {
  loading: boolean;
  estimatedDaysToFresh: number | null;
  consecutiveDays: number;
  performancePercent: number | null;
  fatigueTypeLabel: string | null;
  fatigueType: string;
}): string | null {
  if (options.loading) {
    return null;
  }
  return (
    effortFreshnessLine(options.estimatedDaysToFresh) ??
    effortAccumulationLine(options.consecutiveDays) ??
    effortCapacityLine(options.performancePercent) ??
    effortFatigueLine(options.fatigueTypeLabel, options.fatigueType)
  );
}

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
  const actionLine = effortActionLine({
    loading,
    estimatedDaysToFresh,
    consecutiveDays,
    performancePercent,
    fatigueTypeLabel,
    fatigueType,
  });

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
      quickReadCaption={actionLine ?? undefined}
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
