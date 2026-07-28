import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import {
  ActivityStreamChart,
  buildStreamMetricOptions,
  pickDefaultStreamMetricKeys,
} from './activity-stream-chart';

describe('buildStreamMetricOptions', () => {
  it('builds run metrics with pace instead of speed', () => {
    const metrics = buildStreamMetricOptions(
      {
        altitude: true,
        hr: true,
        watts: false,
        cadence: true,
        speed: true,
      },
      ActivityType.RUN,
    );

    expect(metrics.map((metric) => metric.key)).toEqual(['hr', 'pace', 'alt', 'cadence']);
  });
});

describe('pickDefaultStreamMetricKeys', () => {
  it('prefers hr + watts for bike and hr + pace for run', () => {
    const bikeMetrics = buildStreamMetricOptions(
      {
        altitude: true,
        hr: true,
        watts: true,
        cadence: true,
        speed: true,
      },
      ActivityType.BIKE,
    );
    const runMetrics = buildStreamMetricOptions(
      {
        altitude: true,
        hr: true,
        watts: false,
        cadence: true,
        speed: true,
      },
      ActivityType.RUN,
    );

    expect(pickDefaultStreamMetricKeys(bikeMetrics, ActivityType.BIKE)).toEqual(['hr', 'watts']);
    expect(pickDefaultStreamMetricKeys(runMetrics, ActivityType.RUN)).toEqual(['hr', 'pace']);
  });
});

describe('ActivityStreamChart', () => {
  it('renders one comparison panel with toggle chips and active count', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityStreamChart, {
        has: {
          distance: true,
          altitude: true,
          hr: true,
          watts: true,
          cadence: true,
          speed: true,
        },
        type: ActivityType.BIKE,
        samples: [
          {
            xDistanceKm: 0,
            xTimeMin: 0,
            alt: 120,
            hr: 140,
            watts: 210,
            cadence: 86,
            speed: 28.4,
            pace: null,
          },
          {
            xDistanceKm: 1,
            xTimeMin: 2.4,
            alt: 128,
            hr: 146,
            watts: 225,
            cadence: 88,
            speed: 29.1,
            pace: null,
          },
        ],
      }),
    );

    expect(html).toContain('Comparer les courbes');
    expect(html).toContain('2/5 actives');
    expect(html).toContain('FC');
    expect(html).toContain('Puissance');
    expect(html).toContain('Dénivelé');
    expect(html).toContain('Active 1 ou 2 séries pour garder des axes lisibles.');
  });
});
