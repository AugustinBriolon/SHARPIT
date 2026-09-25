import type { StreamSample } from '@/lib/streams/streams';
import { isSet } from '@/lib/util/value';

export interface NormalizedStreamChartPoint {
  xDistanceKm: number;
  xTimeMin: number;
  alt: number | null;
  hr: number | null;
  watts: number | null;
  cadence: number | null;
  speed: number | null;
  pace: number | null;
}

export function formatAltitudeMeters(value: number): string {
  return value.toFixed(2);
}

export function normalizeStreamChartData(samples: StreamSample[]): NormalizedStreamChartPoint[] {
  return samples.map((sample) => {
    const speedKmh = isSet(sample.speed) ? sample.speed * 3.6 : null;
    const pace = isSet(sample.speed) && sample.speed > 0.3 ? 1000 / sample.speed : null;

    return {
      xDistanceKm: Number((sample.d / 1000).toFixed(3)),
      xTimeMin: Number((sample.t / 60).toFixed(2)),
      alt: isSet(sample.alt) ? Number(sample.alt.toFixed(2)) : null,
      hr: sample.hr,
      watts: sample.watts,
      cadence: sample.cadence,
      speed: isSet(speedKmh) ? Number(speedKmh.toFixed(1)) : null,
      pace: isSet(pace) ? Math.round(pace) : null,
    };
  });
}
