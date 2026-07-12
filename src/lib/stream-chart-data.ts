import type { StreamSample } from '@/lib/streams';

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
    const speedKmh = sample.speed != null ? sample.speed * 3.6 : null;
    const pace = sample.speed != null && sample.speed > 0.3 ? 1000 / sample.speed : null;

    return {
      xDistanceKm: Number((sample.d / 1000).toFixed(3)),
      xTimeMin: Number((sample.t / 60).toFixed(2)),
      alt: sample.alt != null ? Number(sample.alt.toFixed(2)) : null,
      hr: sample.hr,
      watts: sample.watts,
      cadence: sample.cadence,
      speed: speedKmh != null ? Number(speedKmh.toFixed(1)) : null,
      pace: pace != null ? Math.round(pace) : null,
    };
  });
}
