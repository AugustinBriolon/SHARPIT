import { describe, expect, it } from 'vitest';
import { computeTrainingLoad } from './training-load';

const REF = new Date('2026-01-31T12:00:00');

describe('computeTrainingLoad', () => {
  it('renvoie des valeurs neutres sans activité', () => {
    const res = computeTrainingLoad([], REF);
    expect(res).toEqual({ weeklyLoad: 0, acwr: 0, fatigue: 'Low' });
  });

  it("calcule l'ACWR et marque une charge aiguë élevée", () => {
    // Une seule séance aujourd'hui : aigu = 100, chronique = 100/6 ≈ 16.7.
    const res = computeTrainingLoad([{ load: 100, date: REF }], REF);
    expect(res.weeklyLoad).toBe(100);
    expect(res.acwr).toBeCloseTo(6, 1);
    expect(res.fatigue).toBe('High');
  });

  it('ignore les activités hors de la fenêtre chronique (42 j)', () => {
    const old = new Date('2025-11-01T12:00:00'); // > 42 j avant REF
    const res = computeTrainingLoad([{ load: 500, date: old }], REF);
    expect(res.weeklyLoad).toBe(0);
    expect(res.acwr).toBe(0);
  });

  it('classe la fatigue Medium dans la zone 0.9–1.3', () => {
    // Charge stable ~équilibrée : aigu sur 7 j, chronique répartie sur 42 j.
    const activities = Array.from({ length: 42 }, (_, i) => ({
      load: 50,
      date: new Date(REF.getTime() - i * 24 * 3600 * 1000),
    }));
    const res = computeTrainingLoad(activities, REF);
    expect(res.fatigue).toBe('Medium');
    expect(res.acwr).toBeGreaterThanOrEqual(0.9);
    expect(res.acwr).toBeLessThan(1.3);
  });

  it('traite null comme 0 de charge', () => {
    const res = computeTrainingLoad([{ load: null, date: REF }], REF);
    expect(res.weeklyLoad).toBe(0);
  });
});
