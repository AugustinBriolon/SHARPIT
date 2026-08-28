import { ActivityType, GoalHorizon } from '@prisma/client';
import { useMemo, useState } from 'react';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import {
  distancePresetsForSport,
  formatChronoSeconds,
  formatDistanceLabel,
  inferPerformanceEndMode,
  parseChronoInput,
  parseGoalMetricConfig,
  targetInputFromStored,
  type GoalEndMode,
  type GoalPeriod,
  type PeriodMeasure,
} from '@/lib/goals/goal-metric-config';

const ALL_SPORTS = 'ALL';

function toDateInput(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toISOString().slice(0, 10);
}

export function useMetricGoalFormState(goal?: GoalForEdit | null) {
  const existing = useMemo(() => parseGoalMetricConfig(goal?.metricKey), [goal?.metricKey]);

  const [sport, setSport] = useState<ActivityType>(() => {
    if (existing?.template === 'performance') {
      return existing.sport;
    }
    return ActivityType.RUN;
  });
  const [distancePreset, setDistancePreset] = useState<string>(() => {
    if (existing?.template !== 'performance') {
      return '5k';
    }
    const presets = distancePresetsForSport(existing.sport);
    const match = presets.find((p) => p.distanceM === existing.distanceM);
    return match?.id ?? 'custom';
  });
  const [customDistanceKm, setCustomDistanceKm] = useState(() => {
    if (existing?.template === 'performance') {
      const presets = distancePresetsForSport(existing.sport);
      const isCustom = !presets.some((p) => p.distanceM === existing.distanceM);
      if (isCustom) {
        return String(existing.distanceM / 1000);
      }
    }
    return '';
  });
  const [chronoTarget, setChronoTarget] = useState(() => {
    if (
      existing?.template === 'performance' &&
      goal !== null &&
      goal !== undefined &&
      goal.targetValue !== null
    ) {
      return formatChronoSeconds(goal.targetValue);
    }
    return '';
  });
  const [performanceEndMode, setPerformanceEndMode] = useState<GoalEndMode>(() => {
    if (existing?.template === 'performance') {
      return inferPerformanceEndMode(existing, goal?.targetDate);
    }
    return 'on_achieved';
  });
  const [performanceEndDate, setPerformanceEndDate] = useState(() => {
    if (
      existing?.template === 'performance' &&
      inferPerformanceEndMode(existing, goal?.targetDate) === 'on_date'
    ) {
      return toDateInput(goal?.targetDate);
    }
    return '';
  });
  const [period, setPeriod] = useState<GoalPeriod>(
    existing?.template === 'period' ? existing.period : 'WEEK',
  );
  const [measure, setMeasure] = useState<PeriodMeasure>(
    existing?.template === 'period' ? existing.measure : 'distance',
  );
  const [periodSport, setPeriodSport] = useState<string>(() => {
    if (existing?.template === 'period') {
      return existing.sport ?? ALL_SPORTS;
    }
    return ALL_SPORTS;
  });
  const [periodTarget, setPeriodTarget] = useState(() => {
    if (
      existing?.template === 'period' &&
      goal !== null &&
      goal !== undefined &&
      goal.targetValue !== null
    ) {
      return targetInputFromStored(existing.measure, goal.targetValue);
    }
    return '';
  });
  const [periodEndDate, setPeriodEndDate] = useState(() => toDateInput(goal?.targetDate));
  const [customTitle, setCustomTitle] = useState(goal?.title ?? '');

  function resolveDistanceM(): number | null {
    if (distancePreset === 'custom') {
      const km = Number(customDistanceKm.replace(',', '.'));
      if (!Number.isFinite(km) || km <= 0) {
        return null;
      }
      return Math.round(km * 1000);
    }
    const preset = distancePresetsForSport(sport).find((p) => p.id === distancePreset);
    return preset?.distanceM ?? null;
  }

  const suggestedPerformanceTitle = useMemo(() => {
    const distanceM = resolveDistanceM();
    const targetSeconds = parseChronoInput(chronoTarget);
    if (!distanceM || !targetSeconds) {
      return '';
    }
    return `${formatDistanceLabel(distanceM)} en ${formatChronoSeconds(targetSeconds)}`;
  }, [chronoTarget, customDistanceKm, distancePreset, sport]);

  function handleSportChange(next: ActivityType) {
    setSport(next);
    const nextPresets = distancePresetsForSport(next);
    setDistancePreset(nextPresets[0]?.id ?? 'custom');
  }

  return {
    sport,
    distancePreset,
    customDistanceKm,
    chronoTarget,
    performanceEndMode,
    performanceEndDate,
    period,
    measure,
    periodSport,
    periodTarget,
    periodEndDate,
    customTitle,
    suggestedPerformanceTitle,
    resolveDistanceM,
    setChronoTarget,
    setCustomDistanceKm,
    setCustomTitle,
    setDistancePreset,
    setMeasure,
    setPerformanceEndDate,
    setPerformanceEndMode,
    setPeriod,
    setPeriodEndDate,
    setPeriodSport,
    setPeriodTarget,
    handleSportChange,
  };
}
