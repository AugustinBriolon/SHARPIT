import { describe, expect, it } from 'vitest';
import { buildPushToastDescription } from '@/lib/integrations/garmin/garmin-push-summary';

describe('buildPushToastDescription', () => {
  it('summarises a strength push by exercise', () => {
    expect(
      buildPushToastDescription({
        workoutName: 'Bas du corps',
        mapped: [{ confidence: 'exact' }, { confidence: 'fallback' }],
        skipped: [{}],
        scheduledDate: '2026-08-21',
      }),
    ).toBe(
      'Bas du corps · 2 exercices · 1 en nom générique · 1 omis (hors catalogue) · calendrier 2026-08-21',
    );
  });

  it('summarises an endurance push by step', () => {
    expect(
      buildPushToastDescription({
        workoutName: 'Seuil 5x800',
        stepCount: 12,
        scheduledDate: '2026-08-21',
      }),
    ).toBe('Seuil 5x800 · 12 étapes · calendrier 2026-08-21');
  });

  it('says when a session was derived rather than prescribed', () => {
    expect(buildPushToastDescription({ workoutName: 'Footing', stepCount: 1, derived: true })).toBe(
      'Footing · 1 étape · séance simple (durée + intensité)',
    );
  });

  it('flags a push that went out without guidance', () => {
    expect(
      buildPushToastDescription({
        workoutName: 'Footing',
        stepCount: 1,
        warnings: ['Allure seuil inconnue — cible allure impossible.'],
      }),
    ).toBe('Footing · 1 étape · sans cible chiffrée');
  });
});
