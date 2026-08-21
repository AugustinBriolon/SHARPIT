'use client';

import { MarkerBand } from '@/components/today/drill-down/marker-band';
import { deltaVsTrailingWeek, observedRange } from '@/lib/today/marker-series';

type Series = { date: string; value: number | null }[];

/**
 * The three physiological markers, each on the range that makes it readable.
 *
 * HRV has a computed personal baseline; resting heart rate and body battery do
 * not, so they are positioned against the fortnight actually observed and
 * labelled as such. Borrowing the word "baseline" for a two-week span would
 * dress an observation as a norm.
 */
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
  const hrvValues = sparkHrv.map((point) => point.value);
  const rhrValues = sparkRhr.map((point) => point.value);

  const hrvRange =
    baselineLow != null && baselineHigh != null
      ? { low: Math.round(baselineLow), high: Math.round(baselineHigh), kind: 'baseline' as const }
      : null;
  const rhrObserved = observedRange(rhrValues);
  const batteryObserved = observedRange(batterySeries);

  return (
    /* Three blocks side by side on a wide screen: the row used sixteen percent of
       its width and left the rest empty, which is not restraint but waste. */
    <div className="grid gap-x-8 gap-y-1 sm:grid-cols-3 sm:gap-y-0">
      <MarkerBand
        delta={deltaVsTrailingWeek(hrvValues)}
        label="VFC"
        range={hrvRange}
        series={hrvValues}
        unit="ms"
        value={hrv}
      />
      <MarkerBand
        delta={deltaVsTrailingWeek(rhrValues)}
        label="FC repos"
        range={rhrObserved ? { ...rhrObserved, kind: 'observed' } : null}
        series={rhrValues}
        unit="bpm"
        value={restingHr}
        lowerIsBetter
      />
      <MarkerBand
        delta={deltaVsTrailingWeek(batterySeries)}
        label="Batterie"
        range={batteryObserved ? { ...batteryObserved, kind: 'observed' } : null}
        series={batterySeries}
        unit="énergie"
        value={bodyBattery}
      />
    </div>
  );
}
