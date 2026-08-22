'use client';

import { MarkerCardGrid, type MarkerSpec } from '@/components/today/drill-down/marker-card-grid';
import { ACWR_SWEET_SPOT } from '@/lib/effort/load-reading';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
import { GLOSSARY } from '@/lib/glossary';
import { observedRange } from '@/lib/today/marker-series';

/**
 * All three readings are computed from the athlete's thresholds, so all three
 * raise the same doubt — "these numbers feel wrong for me". The answer used to be
 * three taps away behind Entraînement → Progression → Calibration, which is not
 * where anyone is standing when the doubt arrives.
 */
const CALIBRATION_ACTION = {
  label: 'Ajuster mes seuils',
  href: TWIN_DRILL_DOWN.calibration,
} as const;

/** TSB bands already used by the chip labels — kept aligned, not re-invented. */
const FORM_BAND = { low: -20, high: 10 } as const;

export function EffortMarkers({
  acwr,
  weeklyLoad,
  tsb,
  weeklyTss,
  pmcSeries,
}: {
  acwr: number;
  weeklyLoad: number;
  tsb: number | null;
  weeklyTss: { week: string; tss: number }[];
  pmcSeries: { label: string; ctl: number; atl: number; tsb: number }[];
}) {
  const weeklyPoints = weeklyTss.map((point) => ({ label: point.week, value: point.tss }));
  const weeklyObserved = observedRange(weeklyPoints.map((point) => point.value));

  const specs: MarkerSpec[] = [
    {
      key: 'ramp',
      label: 'Montée',
      unit: '',
      value: acwr > 0 ? acwr : null,
      // ACWR is a 7 d / 28 d ratio, and nothing in the PMC series reconstructs it
      // honestly — an ATL/CTL proxy labelled "ACWR" would be a different number.
      points: [],
      range: { ...ACWR_SWEET_SPOT, kind: 'baseline' },
      explanation: GLOSSARY.acwr.definition,
      action: CALIBRATION_ACTION,
      format: (value) => value.toFixed(2),
    },
    {
      key: 'weekly',
      label: 'Charge 7 j',
      unit: 'TSS',
      value: weeklyLoad > 0 ? weeklyLoad : null,
      points: weeklyPoints,
      range: weeklyObserved ? { ...weeklyObserved, kind: 'observed' } : null,
      explanation: `${GLOSSARY.tss.definition} Le repère ici est ce que tu as réellement fait sur les semaines précédentes, pas une cible.`,
      action: CALIBRATION_ACTION,
    },
    {
      key: 'form',
      label: 'Forme',
      unit: '',
      value: tsb,
      points: pmcSeries.map((point) => ({ label: point.label, value: Math.round(point.tsb) })),
      range: { ...FORM_BAND, kind: 'baseline' },
      explanation: GLOSSARY.tsb.definition,
      action: CALIBRATION_ACTION,
      format: (value) => `${value > 0 ? '+' : ''}${Math.round(value)}`,
    },
  ];

  return <MarkerCardGrid specs={specs} />;
}
