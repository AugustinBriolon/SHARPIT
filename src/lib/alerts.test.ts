import { describe, expect, it } from 'vitest';
import { computeAlerts } from './alerts';

const REF = new Date('2026-01-31T12:00:00');

describe('computeAlerts', () => {
  it('ne renvoie aucune alerte sans signal', () => {
    expect(computeAlerts({ activities: [], health: [], physicalNotes: [], refDate: REF })).toEqual(
      [],
    );
  });

  it('alerte sur une charge en zone de risque (ACWR ≥ 1.5)', () => {
    const alerts = computeAlerts({
      activities: [{ load: 300, date: REF }],
      health: [],
      physicalNotes: [],
      refDate: REF,
    });
    expect(alerts.some((a) => a.id === 'acwr-high')).toBe(true);
  });

  it('alerte sur une douleur sévère mais ignore une posture', () => {
    const alerts = computeAlerts({
      activities: [],
      health: [],
      physicalNotes: [
        { title: 'Tendinite', severity: 8, status: 'ACTIVE', category: 'PAIN' },
        { title: 'Bassin rétroversé', severity: 8, status: 'ACTIVE', category: 'POSTURE' },
      ],
      refDate: REF,
    });
    const pain = alerts.find((a) => a.id === 'pain-severe');
    expect(pain).toBeDefined();
    expect(pain!.title).toContain('Tendinite');
    expect(pain!.title).not.toContain('Bassin');
  });

  it('trie par sévérité décroissante (danger en premier)', () => {
    const alerts = computeAlerts({
      activities: [{ load: 400, date: REF }],
      health: [],
      physicalNotes: [{ title: 'Déchirure', severity: 9, status: 'ACTIVE', category: 'INJURY' }],
      refDate: REF,
    });
    expect(alerts[0].severity).toBe('danger');
  });

  it('alerte sur une dette de sommeil', () => {
    const health = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(REF.getTime() - i * 24 * 3600 * 1000),
      recoveryScore: 70,
      hrv: 60,
      hrvStatus: 'BALANCED',
      restingHr: 50,
      sleepMinutes: 330,
    }));
    const alerts = computeAlerts({
      activities: [],
      health,
      physicalNotes: [],
      refDate: REF,
    });
    expect(alerts.some((a) => a.id === 'sleep-debt')).toBe(true);
  });
});
