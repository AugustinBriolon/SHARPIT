'use client';

import {
  filterChartData,
  TREND_WINDOWS,
  windowDeltaDisplay,
  type TrendWindowId,
} from '@/components/corps/composition/composition-view-parts';
import type { CompositionMetricId } from '@/lib/health/composition-metric-guides';
import {
  isPresentationValuesLoading,
  useBodyPresentationViewModel,
} from '@/hooks/use-presentation-view-model';
import { useMemo, useState } from 'react';

const HERO_MINI_KEYS = [
  { key: 'bodyFatPct', label: 'Masse grasse', unit: '%' },
  { key: 'musclePct', label: 'Muscle', unit: '%' },
  { key: 'visceralFat', label: 'Viscéral', unit: '' },
  { key: 'waterPct', label: 'Eau corporelle', unit: '%' },
] as const;

function buildHeroMiniMetrics(
  vm: NonNullable<ReturnType<typeof useBodyPresentationViewModel>['data']>,
) {
  return HERO_MINI_KEYS.map(({ key, label, unit }) => {
    const metric = vm.hero.heroMini[key];
    return {
      key,
      label,
      metric,
      value: metric.value !== null ? `${metric.value}${unit ? ` ${unit}` : ''}` : '—',
      delta: metric.deltaDisplay && metric.deltaDisplay !== '—' ? metric.deltaDisplay : undefined,
    };
  });
}

function buildHeroHints(
  vm: NonNullable<ReturnType<typeof useBodyPresentationViewModel>['data']>,
  heroMiniMetrics: ReturnType<typeof buildHeroMiniMetrics>,
) {
  const hints: { label: string; text: string }[] = [];
  if (vm.hero.weightDeltaHint) {
    hints.push({ label: 'Poids', text: vm.hero.weightDeltaHint });
  }
  for (const { label, metric } of heroMiniMetrics) {
    if (metric.deltaHint) {
      hints.push({ label, text: metric.deltaHint });
    }
  }
  return hints;
}

export function useCompositionView() {
  const [trendWindow, setTrendWindow] = useState<TrendWindowId>('90d');
  const selectedWindow = TREND_WINDOWS.find((w) => w.id === trendWindow) ?? TREND_WINDOWS[2];

  const query = useBodyPresentationViewModel();
  const valuesLoading = isPresentationValuesLoading(query);
  const vm = query.data ?? null;

  const [explainMetricId, setExplainMetricId] = useState<CompositionMetricId | null>(null);

  const activeExplainer =
    !valuesLoading && explainMetricId ? vm?.explainerByMetricId[explainMetricId] : null;

  const chartData = filterChartData(vm?.chartData, selectedWindow.days);

  const heroMiniMetrics = useMemo(() => {
    if (!vm?.hasData) {
      return [];
    }
    return buildHeroMiniMetrics(vm);
  }, [vm]);

  const heroHints = useMemo(() => {
    if (!vm?.hasData || valuesLoading) {
      return [];
    }
    return buildHeroHints(vm, heroMiniMetrics);
  }, [vm, heroMiniMetrics, valuesLoading]);

  const allDetailCards = useMemo(() => {
    if (!vm?.hasData) {
      return [];
    }
    return [...vm.trajectoryCards, ...vm.contextCards, ...vm.healthScanCards];
  }, [vm]);

  const trendDelta = !valuesLoading
    ? windowDeltaDisplay(chartData, 'weightKg', ' kg', selectedWindow.label)
    : null;

  const chartEmptyInWindow = chartData.length === 0;

  return {
    activeExplainer,
    allDetailCards,
    chartData,
    chartEmptyInWindow,
    explainMetricId,
    heroHints,
    heroMiniMetrics,
    selectedWindow,
    setExplainMetricId,
    setTrendWindow,
    trendDelta,
    trendWindow,
    valuesLoading,
    vm,
  };
}
