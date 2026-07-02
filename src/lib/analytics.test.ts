import { describe, expect, it } from 'vitest';
import { computePmcSeries, estimateActivityLoad } from './analytics';
import type { ActivityForAnalytics } from './analytics';
import { ActivityType } from '@prisma/client';

const REF_DATE = new Date('2026-01-31T12:00:00');

function makeActivity(
  date: Date,
  type: ActivityType,
  load: number | null = null,
  durationMin: number | null = null,
): ActivityForAnalytics {
  return {
    date,
    type,
    duration: durationMin != null ? durationMin * 60 : null,
    load,
    bikeMetrics: null,
  };
}

describe('estimateActivityLoad', () => {
  it('utilise le load explicite si disponible', () => {
    const activity = makeActivity(REF_DATE, 'RUN', 150);
    expect(estimateActivityLoad(activity)).toBe(150);
  });

  it('utilise TSS vélo depuis bikeMetrics si disponible', () => {
    const activity: ActivityForAnalytics = {
      date: REF_DATE,
      type: 'BIKE',
      duration: 3600,
      load: null,
      bikeMetrics: { tss: 200 },
    };
    expect(estimateActivityLoad(activity)).toBe(200);
  });

  it('estime la charge depuis durée avec LOAD_FACTOR (course)', () => {
    const activity = makeActivity(REF_DATE, 'RUN', null, 60);
    // RUN factor = 1.0, donc 60 min × 1.0 = 60 TSS
    expect(estimateActivityLoad(activity)).toBe(60);
  });

  it('estime la charge depuis durée avec LOAD_FACTOR (vélo)', () => {
    const activity = makeActivity(REF_DATE, 'BIKE', null, 60);
    // BIKE factor = 0.85, donc 60 min × 0.85 = 51 TSS
    expect(estimateActivityLoad(activity)).toBe(51);
  });

  it('estime la charge depuis durée avec LOAD_FACTOR (natation)', () => {
    const activity = makeActivity(REF_DATE, 'SWIM', null, 60);
    // SWIM factor = 1.1, donc 60 min × 1.1 = 66 TSS
    expect(estimateActivityLoad(activity)).toBe(66);
  });

  it('estime la charge depuis durée avec LOAD_FACTOR (musculation)', () => {
    const activity = makeActivity(REF_DATE, 'STRENGTH', null, 60);
    // STRENGTH factor = 0.7, donc 60 min × 0.7 = 42 TSS
    expect(estimateActivityLoad(activity)).toBe(42);
  });

  it('renvoie 0 sans duration ni load', () => {
    const activity = makeActivity(REF_DATE, 'RUN');
    expect(estimateActivityLoad(activity)).toBe(0);
  });
});

describe('computePmcSeries', () => {
  it("renvoie série vide si pas d'activité sur la période", () => {
    const series = computePmcSeries([], 7);
    // 7 jours + aujourd'hui = 8 points
    expect(series).toHaveLength(8);
    // Tous les points devraient avoir TSS=0 et CTL/ATL/TSB=0
    expect(series.every((p) => p.tss === 0)).toBe(true);
    expect(series.every((p) => p.ctl === 0)).toBe(true);
    expect(series.every((p) => p.atl === 0)).toBe(true);
    expect(series.every((p) => p.tsb === 0)).toBe(true);
  });

  it('calcule correctement CTL avec constante τ=42 jours', () => {
    // Une séance de 100 TSS aujourd'hui
    const activities = [makeActivity(REF_DATE, 'RUN', 100)];
    const series = computePmcSeries(activities, 2, REF_DATE);

    // Jour 0 (avant séance) : CTL = 0
    // Jour 1 (jour séance) : CTL = 0 + (100 - 0) / 42 = 2.38
    // Jour 2 : CTL = 2.38 + (0 - 2.38) / 42 = 2.38 - 0.057 = 2.32
    const lastPoint = series[series.length - 1];
    expect(lastPoint.ctl).toBeGreaterThan(0);
    expect(lastPoint.ctl).toBeLessThan(5); // Faible car constante 42j
  });

  it('calcule correctement ATL avec constante τ=7 jours', () => {
    // Une séance de 100 TSS aujourd'hui
    const activities = [makeActivity(REF_DATE, 'RUN', 100)];
    const series = computePmcSeries(activities, 2, REF_DATE);

    // Jour 0 : ATL = 0
    // Jour 1 : ATL = 0 + (100 - 0) / 7 = 14.29
    // Jour 2 : ATL = 14.29 + (0 - 14.29) / 7 = 14.29 - 2.04 = 12.25
    const lastPoint = series[series.length - 1];
    expect(lastPoint.atl).toBeGreaterThan(10);
    expect(lastPoint.atl).toBeLessThan(15); // Plus élevé que CTL car constante plus courte
  });

  it('TSB = CTL - ATL (définition mathématique)', () => {
    const activities = [
      makeActivity(new Date('2026-01-28T12:00:00'), 'RUN', 100),
      makeActivity(new Date('2026-01-29T12:00:00'), 'RUN', 80),
      makeActivity(new Date('2026-01-30T12:00:00'), 'BIKE', 60),
    ];
    const series = computePmcSeries(activities, 5, REF_DATE);

    // Vérifier que TSB = CTL - ATL pour tous les points
    for (const point of series) {
      const expectedTsb = point.ctl - point.atl;
      // Tolérance d'arrondi (Math.round utilisé dans le code)
      expect(Math.abs(point.tsb - expectedTsb)).toBeLessThanOrEqual(1);
    }
  });

  it('CTL augmente progressivement avec charge soutenue', () => {
    // 10 jours d'entraînement à 100 TSS/jour
    const activities = Array.from({ length: 10 }, (_, i) => {
      const date = new Date(REF_DATE.getTime() - i * 24 * 3600 * 1000);
      return makeActivity(date, 'RUN', 100);
    });

    const series = computePmcSeries(activities, 15, REF_DATE);
    const ctlValues = series.slice(-5).map((p) => p.ctl);

    // CTL doit augmenter progressivement
    for (let i = 1; i < ctlValues.length; i++) {
      expect(ctlValues[i]).toBeGreaterThanOrEqual(ctlValues[i - 1]);
    }
  });

  it('ATL réagit plus rapidement que CTL (constante plus courte)', () => {
    // Grosse séance soudaine après repos
    const activities = [makeActivity(REF_DATE, 'RUN', 200)];
    const series = computePmcSeries(activities, 3, REF_DATE);
    const lastPoint = series[series.length - 1];

    // ATL devrait être beaucoup plus élevé que CTL après une séance unique
    // car τ_atl (7j) << τ_ctl (42j)
    expect(lastPoint.atl).toBeGreaterThan(lastPoint.ctl * 3);
  });

  it('TSB négatif signale fatigue (ATL > CTL)', () => {
    // Semaine très chargée (500 TSS en 7j) sans historique
    const activities = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(REF_DATE.getTime() - i * 24 * 3600 * 1000);
      return makeActivity(date, 'RUN', 70);
    });

    const series = computePmcSeries(activities, 10, REF_DATE);
    const lastPoint = series[series.length - 1];

    // ATL devrait être élevé, CTL faible (pas d'historique) → TSB négatif
    expect(lastPoint.tsb).toBeLessThan(0);
    expect(lastPoint.atl).toBeGreaterThan(lastPoint.ctl);
  });

  it('TSB positif après désentraînement (CTL > ATL)', () => {
    // Charge ancienne (15-30j en arrière) mais rien de récent
    const activities = Array.from({ length: 15 }, (_, i) => {
      const date = new Date(REF_DATE.getTime() - (i + 15) * 24 * 3600 * 1000);
      return makeActivity(date, 'RUN', 80);
    });

    const series = computePmcSeries(activities, 35, REF_DATE);
    const lastPoint = series[series.length - 1];

    // CTL résiduel, ATL décrue → TSB devrait être positif
    expect(lastPoint.tsb).toBeGreaterThan(0);
    expect(lastPoint.ctl).toBeGreaterThan(lastPoint.atl);
  });

  it('respecte la période demandée (jours)', () => {
    const series = computePmcSeries([], 30);
    // 30 jours en arrière + aujourd'hui = 31 points
    expect(series).toHaveLength(31);
  });

  it('agrège correctement plusieurs activités le même jour', () => {
    // 2 séances le même jour
    const activities = [makeActivity(REF_DATE, 'RUN', 50), makeActivity(REF_DATE, 'BIKE', 40)];

    const series = computePmcSeries(activities, 2, REF_DATE);
    const dayPoint = series.find((p) => p.date === '2026-01-31')!;

    // TSS du jour devrait être 50 + 40 = 90
    expect(dayPoint.tss).toBe(90);
  });
});
