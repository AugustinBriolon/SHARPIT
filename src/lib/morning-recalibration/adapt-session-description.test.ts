import { describe, expect, it } from 'vitest';
import { adaptMorningSessionDescription } from '@/lib/morning-recalibration/adapt-session-description';

const deroule =
  'Travail en salle : 1. Mobilité bassin/sciatique. 2. Exercices lestés modérés. 3. Travail postural (pied en canard) via des fentes contrôlées.';

describe('adaptMorningSessionDescription', () => {
  it('leaves endurance descriptions unchanged', () => {
    expect(
      adaptMorningSessionDescription({
        type: 'RUN',
        description: 'Échauffement · 5×3 min seuil · retour au calme',
        direction: 'DOWN',
      }),
    ).toBe('Échauffement · 5×3 min seuil · retour au calme');
  });

  it('removes loaded work language when easing strength', () => {
    const next = adaptMorningSessionDescription({
      type: 'STRENGTH',
      description: deroule,
      direction: 'DOWN',
    });
    expect(next).toMatch(/Version allégée/);
    expect(next).toMatch(/sans charge lourde/);
    expect(next).not.toMatch(/Exercices lestés modérés/);
    expect(next).toMatch(/Mobilité bassin/);
  });

  it('adds a controlled progression note when pushing strength', () => {
    const next = adaptMorningSessionDescription({
      type: 'STRENGTH',
      description: deroule,
      direction: 'UP',
    });
    expect(next).toContain(deroule);
    expect(next).toMatch(/progression légère/);
  });
});
