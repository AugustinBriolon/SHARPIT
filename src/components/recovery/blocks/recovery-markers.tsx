'use client';

import { MarkerCardGrid, type MarkerSpec } from '@/components/today/drill-down/marker-card-grid';
import type { MarkerHistoryPoint } from '@/components/today/drill-down/marker-history-chart';
import { GLOSSARY } from '@/lib/glossary';
import { observedRange } from '@/lib/today/marker-series';

/** `date` arrives already formatted for reading ("21 août"), not as a day key. */
type Series = { date: string; value: number | null }[];

function toPoints(series: Series): MarkerHistoryPoint[] {
  return series.map((point) => ({ label: point.date, value: point.value }));
}

export function RecoveryMarkers({
  hrv,
  restingHr,
  bodyBattery,
  sparkHrv,
  sparkRhr,
  batterySeries,
  baselineLow,
  baselineHigh,
}: {
  hrv: number | null;
  restingHr: number | null;
  bodyBattery: number | null;
  sparkHrv: Series;
  sparkRhr: Series;
  batterySeries: Series;
  baselineLow: number | null;
  baselineHigh: number | null;
}) {
  const rhrObserved = observedRange(sparkRhr.map((point) => point.value));
  const batteryObserved = observedRange(batterySeries.map((point) => point.value));

  const specs: MarkerSpec[] = [
    {
      key: 'hrv',
      label: 'VFC',
      unit: 'ms',
      value: hrv,
      points: toPoints(sparkHrv),
      // A computed baseline, unlike the two below — the wording must not blur that.
      range:
        baselineLow !== null && baselineHigh !== null
          ? { low: Math.round(baselineLow), high: Math.round(baselineHigh), kind: 'baseline' }
          : null,
      explanation: GLOSSARY.hrv.definition,
    },
    {
      key: 'rhr',
      label: 'FC repos',
      unit: 'bpm',
      value: restingHr,
      points: toPoints(sparkRhr),
      range: rhrObserved ? { ...rhrObserved, kind: 'observed' } : null,
      lowerIsBetter: true,
      explanation: GLOSSARY.restingHr.definition,
    },
    {
      key: 'battery',
      label: 'Batterie',
      unit: 'énergie',
      value: bodyBattery,
      points: toPoints(batterySeries),
      range: batteryObserved ? { ...batteryObserved, kind: 'observed' } : null,
      explanation: GLOSSARY.bodyBattery.definition,
    },
  ];

  return <MarkerCardGrid specs={specs} />;
}
