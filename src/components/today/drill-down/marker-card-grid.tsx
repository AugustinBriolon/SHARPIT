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
import type { MarkerHistoryPoint } from '@/components/today/drill-down/marker-history-chart';
import { deltaVsTrailingWeek } from '@/lib/today/marker-series';
import { cn } from '@/lib/utils';

export type MarkerSpec = {
  key: string;
  label: string;
  unit: string;
  value: number | null;
  points: MarkerHistoryPoint[];
  range: MarkerRange | null;
  /** A rise reads as a warning for this marker, not a win. */
  lowerIsBetter?: boolean;
  /** What the marker measures, in plain words. Shown only in the module. */
  explanation: string;
  /** What it means for today, when the number alone does not say. */
  reading?: string | null;
  format?: (value: number) => string;
  /** Where "is this number even right?" gets answered. */
  action?: { label: string; href: string } | null;
};

function toDetail(spec: MarkerSpec): MarkerDetail {
  const position =
    spec.value !== null && spec.range !== null ? positionOf(spec.value, spec.range) : null;
  const rangeWord = spec.range?.kind === 'baseline' ? 'ta norme' : 'la plage 14 j';

  return {
    label: spec.label,
    value: spec.value,
    unit: spec.unit,
    delta: deltaVsTrailingWeek(spec.points.map((point) => point.value)),
    range: spec.range,
    series: spec.points,
    explanation: spec.explanation,
    reading: spec.reading ?? null,
    format: spec.format,
    action: spec.action ?? null,
    concerning: position !== null && isConcerning(position, spec.lowerIsBetter ?? false),
    positionWord: position ? `${POSITION_WORD[position]} ${rangeWord}` : null,
  };
}

/**
 * A row of readings, each one card, each card opening its own module.
 *
 * Written once rather than per screen: recovery, load and adaptation ask the same
 * question of different numbers, and three copies of this wiring would have drifted
 * into three slightly different ideas of what a marker is.
 */
export function MarkerCardGrid({ specs }: { specs: MarkerSpec[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  if (specs.length === 0) {
    return null;
  }

  const open = specs.find((spec) => spec.key === openKey) ?? null;

  return (
    <>
      <div className={cn('grid gap-2 sm:gap-3', specs.length >= 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {specs.map((spec) => (
          <MarkerCard
            key={spec.key}
            format={spec.format}
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
