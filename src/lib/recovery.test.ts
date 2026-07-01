import { describe, expect, it } from 'vitest';
import { buildFormView, buildReadinessView, buildHrvStatusView } from './recovery';
import type { PmcPoint } from './analytics';

describe('buildReadinessView', () => {
  it('classifie score >= 75 comme "good"', () => {
    const view = buildReadinessView(80, 'HIGH');
    expect(view.tone).toBe('good');
    expect(view.score).toBe(80);
    expect(view.recommendation).toContain('Bien récupéré');
  });

  it('classifie score 50-74 comme "moderate"', () => {
    const view = buildReadinessView(60, 'MODERATE');
    expect(view.tone).toBe('moderate');
    expect(view.score).toBe(60);
    expect(view.recommendation).toContain('Récupération partielle');
  });

  it('classifie score < 50 comme "low"', () => {
    const view = buildReadinessView(35, 'LOW');
    expect(view.tone).toBe('low');
    expect(view.score).toBe(35);
    expect(view.recommendation).toContain('Fatigue marquée');
  });

  it('gère le cas null score (neutral)', () => {
    const view = buildReadinessView(null, null);
    expect(view.tone).toBe('neutral');
    expect(view.score).toBeNull();
    expect(view.recommendation).toContain('Pas de données');
  });

  it('seuil 75 est bien la limite good/moderate', () => {
    const justGood = buildReadinessView(75, 'HIGH');
    const justModerate = buildReadinessView(74, 'MODERATE');
    expect(justGood.tone).toBe('good');
    expect(justModerate.tone).toBe('moderate');
  });

  it('seuil 50 est bien la limite moderate/low', () => {
    const justModerate = buildReadinessView(50, 'MODERATE');
    const justLow = buildReadinessView(49, 'LOW');
    expect(justModerate.tone).toBe('moderate');
    expect(justLow.tone).toBe('low');
  });
});

describe('buildHrvStatusView', () => {
  it('classifie BALANCED comme good', () => {
    const view = buildHrvStatusView('BALANCED');
    expect(view.tone).toBe('good');
    expect(view.label).toBe('Équilibré');
  });

  it('classifie UNBALANCED_LOW comme low', () => {
    const view = buildHrvStatusView('UNBALANCED_LOW');
    expect(view.tone).toBe('low');
    expect(view.label).toBe('Bas');
  });

  it('classifie UNBALANCED_HIGH comme moderate', () => {
    const view = buildHrvStatusView('UNBALANCED_HIGH');
    expect(view.tone).toBe('moderate');
    expect(view.label).toBe('Élevé');
  });

  it('gère status null (neutral)', () => {
    const view = buildHrvStatusView(null);
    expect(view.tone).toBe('neutral');
    expect(view.label).toBe('—');
  });
});

describe('buildFormView - TSB thresholds', () => {
  function makePmc(tsb: number): PmcPoint[] {
    // Créer un seul point PMC avec le TSB donné
    // (CTL et ATL ajustés pour produire le TSB voulu)
    const ctl = 50;
    const atl = ctl - tsb;
    return [
      {
        date: '2026-01-31',
        label: '31 jan',
        tss: 0,
        ctl,
        atl,
        tsb,
      },
    ];
  }

  it('TSB > +15 : classifié "Frais" (good)', () => {
    const view = buildFormView(makePmc(20));
    expect(view.label).toBe('Frais');
    expect(view.tone).toBe('good');
    expect(view.description).toContain('affûté');
  });

  it('TSB = +15 : limite, ne devrait pas être "Frais"', () => {
    const view = buildFormView(makePmc(15));
    // Selon code : TSB > 15 pour "Frais", donc 15 exact devrait être "Optimal"
    expect(view.label).not.toBe('Frais');
    expect(view.label).toBe('Optimal');
  });

  it('TSB entre -10 et +5 : classifié "Optimal" (good)', () => {
    const view1 = buildFormView(makePmc(0));
    const view2 = buildFormView(makePmc(-5));
    const view3 = buildFormView(makePmc(5));

    expect(view1.label).toBe('Optimal');
    expect(view1.tone).toBe('good');
    expect(view2.label).toBe('Optimal');
    expect(view3.label).toBe('Optimal');
  });

  it('TSB = -10 : limite Optimal/Fatigue', () => {
    const view = buildFormView(makePmc(-10));
    // Selon code : TSB >= -10 pour "Optimal"
    expect(view.label).toBe('Optimal');
  });

  it('TSB entre -30 et -11 : classifié "Fatigue" (moderate)', () => {
    const view1 = buildFormView(makePmc(-15));
    const view2 = buildFormView(makePmc(-25));

    expect(view1.label).toBe('Fatigue');
    expect(view1.tone).toBe('moderate');
    expect(view2.label).toBe('Fatigue');
    expect(view2.tone).toBe('moderate');
  });

  it('TSB = -30 : limite Fatigue/Surcharge', () => {
    const view = buildFormView(makePmc(-30));
    // Selon code : TSB >= -30 pour "Fatigue"
    expect(view.label).toBe('Fatigue');
  });

  it('TSB < -30 : classifié "Surcharge" (low)', () => {
    const view = buildFormView(makePmc(-40));
    expect(view.label).toBe('Surcharge');
    expect(view.tone).toBe('low');
    expect(view.description).toContain('surentraînement');
  });

  it('TSB null : renvoie neutral', () => {
    const view = buildFormView([]);
    expect(view.tsb).toBeNull();
    expect(view.label).toBe('—');
    expect(view.tone).toBe('neutral');
  });

  it('prend le dernier point PMC de la série', () => {
    const pmc: PmcPoint[] = [
      { date: '2026-01-29', label: '29 jan', tss: 100, ctl: 40, atl: 50, tsb: -10 },
      { date: '2026-01-30', label: '30 jan', tss: 0, ctl: 40, atl: 45, tsb: -5 },
      { date: '2026-01-31', label: '31 jan', tss: 80, ctl: 42, atl: 60, tsb: -18 },
    ];

    const view = buildFormView(pmc);
    // Devrait utiliser le dernier point (TSB = -18)
    expect(view.tsb).toBe(-18);
    expect(view.label).toBe('Fatigue');
  });

  it('valide cohérence seuils selon littérature PMC', () => {
    // Vérifie que les seuils correspondent aux standards TrainingPeaks/Coggan
    // TSB > +15 : frais (affûtage course)
    // TSB -10 à +5 : sweet spot progression
    // TSB < -30 : risque surentraînement
    const fresh = buildFormView(makePmc(18));
    const optimal = buildFormView(makePmc(0));
    const fatigued = buildFormView(makePmc(-20));
    const overload = buildFormView(makePmc(-35));

    expect(fresh.tone).toBe('good');
    expect(optimal.tone).toBe('good');
    expect(fatigued.tone).toBe('moderate');
    expect(overload.tone).toBe('low');
  });
});
