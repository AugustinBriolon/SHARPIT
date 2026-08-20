import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ActivityAnalysis } from '@/lib/activity/detail/activity-analysis';
import { PerformanceMetrics } from './performance-metrics';

function buildAnalysis(overrides?: Partial<ActivityAnalysis>): ActivityAnalysis {
  return {
    thresholds: {
      ftp: 260,
      maxHr: 190,
      lthr: 172,
      runThresholdPaceSecPerKm: null,
      source: 'profile',
    },
    load: {
      tss: 84,
      intensityFactor: 0.81,
      method: 'power',
    },
    hr: {
      zones: [],
      decouplingPct: 4,
      efficiencyFactor: 1.28,
      efficiencyLabel: 'EF',
      avgHr: 148,
      maxHr: 171,
    },
    power: {
      normalized: 245,
      avg: 221,
      variabilityIndex: 1.06,
      intensityFactor: 0.81,
      tss: 84,
      zones: [],
    },
    run: null,
    bike: { splits: [] },
    ...overrides,
  };
}

describe('PerformanceMetrics', () => {
  it('renders a single panel with analytical rows for a short metric set', () => {
    const html = renderToStaticMarkup(
      createElement(PerformanceMetrics, {
        analysis: buildAnalysis({
          hr: {
            zones: [],
            decouplingPct: null,
            efficiencyFactor: null,
            efficiencyLabel: 'EF',
            avgHr: 148,
            maxHr: 171,
          },
          power: {
            normalized: 245,
            avg: 221,
            variabilityIndex: null,
            intensityFactor: 0.81,
            tss: 84,
            zones: [],
          },
        }),
      }),
    );

    expect(html).toContain('Performance');
    expect(html).toContain('analysis-panel');
    expect(html).toContain('grid-cols-[minmax(0,11rem)_1fr_auto]');
    expect(html).toContain('NP');
    expect(html).toContain('245 W');
    expect(html).not.toContain('rounded-analysis-lg px-5 py-4');
  });

  it('switches to a compact dense layout when many metrics exist', () => {
    const html = renderToStaticMarkup(
      createElement(PerformanceMetrics, {
        analysis: buildAnalysis({
          run: {
            splits: [],
            paceVariabilityPct: 6,
            avgPaceSecPerKm: 290,
          },
        }),
      }),
    );

    expect(html).toContain('grid-cols-[minmax(0,1fr)_auto] gap-y-1 py-3');
    expect(html).toContain('Variabilité allure');
    expect(html).toContain('Découplage');
    expect(html).toContain('text-base');
  });
});
