import { describe, expect, it } from 'vitest';
import {
  auditUpcomingSessions,
  countSessionsLoadingZone,
  sessionZoneFlags,
  zoneAuditLabel,
} from './sensitive-zone-audit';
import type { SensitiveZone } from './sensitive-zones';

const NOW = new Date('2026-09-13T09:00:00.000Z');

const ZONES: SensitiveZone[] = [
  { label: 'Nerf sciatique', region: 'Ischio', side: 'LEFT', severity: 3, groups: ['upper legs'] },
];

/** What the coach declared when it prescribed the movement. */
const LOADS_ZONE = { exercise: 'Squat gobelet', intent: 'STRENGTH', pattern: 'SQUAT' };
const LOADS_ELSEWHERE = {
  exercise: 'Élévation latérale',
  intent: 'STRENGTH',
  pattern: 'SHOULDER_ABDUCTION',
};
const MOBILISES_ZONE = {
  exercise: 'Étirement ischio-jambiers',
  intent: 'MOBILITY',
  pattern: null,
};

function prescription(movement: Record<string, unknown>) {
  return { version: 1, sets: [{ ...movement, sets: 3, reps: 12, order: 0 }] };
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 's1',
    date: '2026-09-15T08:00:00.000Z',
    title: 'Renfo bas du corps',
    completed: false,
    strengthPrescription: prescription(LOADS_ZONE),
    ...overrides,
  };
}

describe('sessionZoneFlags', () => {
  it('flags an exercise loading a protected zone', () => {
    const flags = sessionZoneFlags(session(), ZONES);

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ exercise: 'Squat gobelet' });
    expect(flags[0]?.zone.label).toBe('Nerf sciatique');
  });

  it('leaves another body group alone', () => {
    expect(
      sessionZoneFlags(session({ strengthPrescription: prescription(LOADS_ELSEWHERE) }), ZONES),
    ).toEqual([]);
  });

  it('never flags mobility work on the zone — the athlete was told to do it', () => {
    expect(
      sessionZoneFlags(session({ strengthPrescription: prescription(MOBILISES_ZONE) }), ZONES),
    ).toEqual([]);
  });

  it('says nothing without a prescription or without zones', () => {
    expect(sessionZoneFlags(session({ strengthPrescription: null, type: 'SWIM' }), ZONES)).toEqual(
      [],
    );
    expect(sessionZoneFlags(session(), [])).toEqual([]);
  });

  it('flags the sport itself when an endurance session loads the zone', () => {
    const flags = sessionZoneFlags(
      session({ strengthPrescription: null, type: 'RUN', title: 'Sortie longue' }),
      ZONES,
    );

    expect(flags).toHaveLength(1);
    expect(flags[0]?.exercise).toBeNull();
    expect(flags[0]?.zone.label).toBe('Nerf sciatique');
  });

  it('leaves an endurance sport that loads elsewhere alone', () => {
    expect(sessionZoneFlags(session({ strengthPrescription: null, type: 'SWIM' }), ZONES)).toEqual(
      [],
    );
  });
});

describe('auditUpcomingSessions', () => {
  it('reports what is still ahead, soonest first', () => {
    const audits = auditUpcomingSessions({
      sessions: [
        session({ id: 'later', date: '2026-09-20T08:00:00.000Z' }),
        session({ id: 'sooner', date: '2026-09-14T08:00:00.000Z' }),
      ],
      zones: ZONES,
      now: NOW,
    });

    expect(audits.map((a) => a.sessionId)).toEqual(['sooner', 'later']);
  });

  it('ignores what is done or already past — the athlete can act on neither', () => {
    expect(
      auditUpcomingSessions({
        sessions: [
          session({ id: 'past', date: '2026-09-10T08:00:00.000Z' }),
          session({ id: 'done', completed: true }),
        ],
        zones: ZONES,
        now: NOW,
      }),
    ).toEqual([]);
  });

  it('stays silent for an athlete with nothing to protect', () => {
    expect(auditUpcomingSessions({ sessions: [session()], zones: [], now: NOW })).toEqual([]);
  });
});

describe('countSessionsLoadingZone', () => {
  it('counts per zone label', () => {
    const audits = auditUpcomingSessions({
      sessions: [session({ id: 'a' }), session({ id: 'b', date: '2026-09-16T08:00:00.000Z' })],
      zones: ZONES,
      now: NOW,
    });

    expect(countSessionsLoadingZone(audits, 'Nerf sciatique')).toBe(2);
    expect(countSessionsLoadingZone(audits, 'Autre chose')).toBe(0);
  });
});

describe('zoneAuditLabel', () => {
  it('reads naturally in both numbers, and says nothing at zero', () => {
    expect(zoneAuditLabel(1)).toBe('1 séance à venir charge cette zone');
    expect(zoneAuditLabel(3)).toBe('3 séances à venir chargent cette zone');
    expect(zoneAuditLabel(0)).toBeNull();
  });
});
