import { describe, expect, it } from 'vitest';
import { computeTrainingLoad } from './training-load';

const REF = new Date('2026-01-31T12:00:00');

describe('computeTrainingLoad', () => {
  it('renvoie des valeurs neutres sans activité', () => {
    const res = computeTrainingLoad([], REF);
    expect(res).toEqual({ weeklyLoad: 0, acwr: 0, fatigue: 'Low' });
  });

  it("calcule l'ACWR et marque une charge aiguë élevée", () => {
    // Une seule séance aujourd'hui :
    // - Charge aiguë (7j) = 100
    // - Charge chronique (42j) = 100, moyenne hebdo = 100/6 ≈ 16.67
    // - ACWR = 100 / 16.67 ≈ 6.0 (très élevé, fatigue High attendue)
    const res = computeTrainingLoad([{ load: 100, date: REF }], REF);
    expect(res.weeklyLoad).toBe(100);
    expect(res.acwr).toBeCloseTo(6.0, 1);
    expect(res.fatigue).toBe('High');
  });

  it('ignore les activités hors de la fenêtre chronique (42 j)', () => {
    const old = new Date('2025-11-01T12:00:00'); // > 42 j avant REF
    const res = computeTrainingLoad([{ load: 500, date: old }], REF);
    expect(res.weeklyLoad).toBe(0);
    expect(res.acwr).toBe(0);
  });

  it('classe la fatigue Medium dans la zone 0.9–1.3', () => {
    // Charge stable équilibrée : 50 TSS chaque jour pendant 42 jours
    // - Charge aiguë (7j) = 7 × 50 = 350
    // - Charge chronique totale (42j) = 42 × 50 = 2100
    // - Moyenne hebdo = 2100 / 6 = 350
    // - ACWR = 350 / 350 = 1.0 (zone Medium : 0.9-1.3)
    const activities = Array.from({ length: 42 }, (_, i) => ({
      load: 50,
      date: new Date(REF.getTime() - i * 24 * 3600 * 1000),
    }));
    const res = computeTrainingLoad(activities, REF);
    expect(res.fatigue).toBe('Medium');
    expect(res.acwr).toBeCloseTo(1.0, 1);
    expect(res.acwr).toBeGreaterThanOrEqual(0.9);
    expect(res.acwr).toBeLessThan(1.3);
  });

  it('détecte correctement une montée progressive (ACWR > 1.3)', () => {
    // Simulation rampe de charge : semaines récentes plus chargées
    // Semaine 1 (la plus récente, 7j) : 7 × 100 = 700
    // Semaines 2-6 : 5 × 7 × 50 = 1750
    // Total chronique : 700 + 1750 = 2450, moyenne hebdo = 2450 / 6 ≈ 408.33
    // ACWR = 700 / 408.33 ≈ 1.71 (zone High attendue)
    const activities = [
      ...Array.from({ length: 7 }, (_, i) => ({
        load: 100,
        date: new Date(REF.getTime() - i * 24 * 3600 * 1000),
      })),
      ...Array.from({ length: 35 }, (_, i) => ({
        load: 50,
        date: new Date(REF.getTime() - (i + 7) * 24 * 3600 * 1000),
      })),
    ];
    const res = computeTrainingLoad(activities, REF);
    expect(res.weeklyLoad).toBe(700);
    expect(res.acwr).toBeGreaterThan(1.3);
    expect(res.fatigue).toBe('High');
  });

  it('détecte une sous-charge (ACWR < 0.9)', () => {
    // Dernière semaine légère après 6 semaines de charge normale
    // Semaine récente (7j) : 7 × 30 = 210
    // Semaines précédentes : 5 × 7 × 60 = 2100
    // Total chronique : 210 + 2100 = 2310, moyenne hebdo = 2310 / 6 = 385
    // ACWR = 210 / 385 ≈ 0.55 (zone Low attendue)
    const activities = [
      ...Array.from({ length: 7 }, (_, i) => ({
        load: 30,
        date: new Date(REF.getTime() - i * 24 * 3600 * 1000),
      })),
      ...Array.from({ length: 35 }, (_, i) => ({
        load: 60,
        date: new Date(REF.getTime() - (i + 7) * 24 * 3600 * 1000),
      })),
    ];
    const res = computeTrainingLoad(activities, REF);
    expect(res.weeklyLoad).toBe(210);
    expect(res.acwr).toBeLessThan(0.9);
    expect(res.fatigue).toBe('Low');
  });

  it('traite null comme 0 de charge', () => {
    const res = computeTrainingLoad([{ load: null, date: REF }], REF);
    expect(res.weeklyLoad).toBe(0);
  });

  it('gère correctement le cas limite avec charge uniquement en chronique, pas en aigu', () => {
    // Activités il y a 14-42 jours, mais rien dans les 7 derniers jours
    // Charge aiguë = 0, ACWR devrait être 0
    const activities = Array.from({ length: 28 }, (_, i) => ({
      load: 50,
      date: new Date(REF.getTime() - (i + 14) * 24 * 3600 * 1000),
    }));
    const res = computeTrainingLoad(activities, REF);
    expect(res.weeklyLoad).toBe(0);
    expect(res.acwr).toBe(0);
    expect(res.fatigue).toBe('Low');
  });
});
