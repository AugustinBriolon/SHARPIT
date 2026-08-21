'use client';

import { useState } from 'react';
import {
  MarkerCard,
  POSITION_WORD,
  isConcerning,
  positionOf,
  type MarkerRange,
} from '@/components/today/drill-down/marker-band';
import {
  MarkerDetailDialog,
  type MarkerDetail,
} from '@/components/today/drill-down/marker-detail-dialog';
import { deltaVsTrailingWeek, observedRange } from '@/lib/today/marker-series';

type Series = { date: string; value: number | null }[];

/** What each marker measures, said once, in the module rather than on the screen. */
const EXPLANATION = {
  hrv: 'Variabilité de la fréquence cardiaque : l’écart entre deux battements au repos. Elle monte quand le système nerveux est disponible, baisse sous fatigue, stress ou dette de sommeil.',
  rhr: 'Fréquence cardiaque au repos, mesurée pendant la nuit. Elle grimpe quand le corps travaille encore à récupérer.',
  battery:
    'Estimation Garmin de l’énergie disponible, reconstituée par le sommeil et consommée par l’effort et le stress.',
} as const;

type MarkerSpec = {
  key: string;
  label: string;
  unit: string;
  value: number | null;
  values: (number | null)[];
  range: MarkerRange | null;
  lowerIsBetter: boolean;
  explanation: string;
};

function toDetail(spec: MarkerSpec): MarkerDetail {
  const position =
    spec.value != null && spec.range != null ? positionOf(spec.value, spec.range) : null;
  return {
    label: spec.label,
    value: spec.value,
    unit: spec.unit,
    delta: deltaVsTrailingWeek(spec.values),
    range: spec.range,
    series: spec.values,
    explanation: spec.explanation,
    concerning: position != null && isConcerning(position, spec.lowerIsBetter),
    positionWord: position
      ? `${POSITION_WORD[position]} ${spec.range?.kind === 'baseline' ? 'ta norme' : 'la plage 14 j'}`
      : null,
  };
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
  batterySeries: (number | null)[];
  baselineLow: number | null;
  baselineHigh: number | null;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const hrvValues = sparkHrv.map((point) => point.value);
  const rhrValues = sparkRhr.map((point) => point.value);
  const rhrObserved = observedRange(rhrValues);
  const batteryObserved = observedRange(batterySeries);

  const specs: MarkerSpec[] = [
    {
      key: 'hrv',
      label: 'VFC',
      unit: 'ms',
      value: hrv,
      values: hrvValues,
      // A computed baseline, unlike the two below — the wording must not blur that.
      range:
        baselineLow != null && baselineHigh != null
          ? { low: Math.round(baselineLow), high: Math.round(baselineHigh), kind: 'baseline' }
          : null,
      lowerIsBetter: false,
      explanation: EXPLANATION.hrv,
    },
    {
      key: 'rhr',
      label: 'FC repos',
      unit: 'bpm',
      value: restingHr,
      values: rhrValues,
      range: rhrObserved ? { ...rhrObserved, kind: 'observed' } : null,
      lowerIsBetter: true,
      explanation: EXPLANATION.rhr,
    },
    {
      key: 'battery',
      label: 'Batterie',
      unit: 'énergie',
      value: bodyBattery,
      values: batterySeries,
      range: batteryObserved ? { ...batteryObserved, kind: 'observed' } : null,
      lowerIsBetter: false,
      explanation: EXPLANATION.battery,
    },
  ];

  const open = specs.find((spec) => spec.key === openKey) ?? null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {specs.map((spec) => (
          <MarkerCard
            key={spec.key}
            label={spec.label}
            lowerIsBetter={spec.lowerIsBetter}
            range={spec.range}
            unit={spec.unit}
            value={spec.value}
            onOpen={() => setOpenKey(spec.key)}
          />
        ))}
      </div>

      <MarkerDetailDialog detail={open ? toDetail(open) : null} onClose={() => setOpenKey(null)} />
    </>
  );
}
