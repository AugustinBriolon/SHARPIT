import { describe, expect, it } from 'vitest';
import {
  computeAnalyticsSummary,
  computePmcSeries,
  computeSportDistribution,
  estimateActivityLoad,
  type ActivityForAnalytics,
} from './analytics';

function act(partial: Partial<ActivityForAnalytics>): ActivityForAnalytics {
  return {
    date: new Date(),
    type: 'RUN',
    duration: null,
    load: null,
    bikeMetrics: null,
    ...partial,
  };
}

describe('estimateActivityLoad', () => {
  it('priorise la charge explicite', () => {
    expect(estimateActivityLoad(act({ load: 80 }))).toBe(80);
  });

  it('utilise le TSS vélo à défaut de charge', () => {
    expect(estimateActivityLoad(act({ load: null, bikeMetrics: { tss: 60 } }))).toBe(60);
  });

  it('estime depuis la durée et le facteur du sport', () => {
    expect(estimateActivityLoad(act({ type: 'RUN', duration: 3600 }))).toBe(60);
    expect(estimateActivityLoad(act({ type: 'STRENGTH', duration: 3600 }))).toBe(42);
  });

  it('renvoie 0 sans donnée exploitable', () => {
    expect(estimateActivityLoad(act({ duration: null }))).toBe(0);
  });
});

describe('computePmcSeries', () => {
  it('produit une série continue jour par jour', () => {
    const series = computePmcSeries([], 30);
    expect(series).toHaveLength(31);
    expect(series.every((p) => p.ctl === 0 && p.atl === 0)).toBe(true);
  });

  it('fait monter CTL/ATL après une grosse séance récente', () => {
    const series = computePmcSeries([act({ load: 200, date: new Date() })], 30);
    const last = series[series.length - 1];
    expect(last.tss).toBe(200);
    expect(last.atl).toBeGreaterThan(last.ctl); // l'aigu réagit plus vite
  });
});

describe('computeSportDistribution', () => {
  it('calcule les parts par sport sur la période', () => {
    const now = new Date();
    const dist = computeSportDistribution(
      [
        act({ type: 'RUN', duration: 3600, date: now }),
        act({ type: 'BIKE', duration: 3600, date: now }),
      ],
      90,
    );
    expect(dist).toHaveLength(2);
    expect(dist.reduce((s, d) => s + d.percent, 0)).toBe(100);
  });
});

describe('computeAnalyticsSummary', () => {
  it('agrège les totaux de la semaine', () => {
    const now = new Date();
    const activities = [act({ load: 50, duration: 3600, date: now })];
    const pmc = computePmcSeries(activities, 30);
    const summary = computeAnalyticsSummary(activities, pmc);
    expect(summary.totalActivities).toBe(1);
    expect(summary.weeklyLoad).toBe(50);
    expect(summary.periodDays).toBe(180);
  });
});
