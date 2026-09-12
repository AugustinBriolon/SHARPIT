import { describe, expect, it } from 'vitest';
import {
  auditUpcomingSessions,
  countSessionsLoadingZone,
  sessionZoneFlags,
  zoneAuditLabel,
} from './sensitive-zone-audit';
import type { SensitiveZone } from './sensitive-zones';

const NOW = new Date('2026-09-13T09:00:00.000Z');

/** Real catalog ids, so the audit proves the mapping rather than a stub. */
const UPPER_LEGS_ID = '1512';
const SHOULDERS_ID = '0977';

const ZONES: SensitiveZone[] = [
  { label: 'Nerf sciatique', region: 'Ischio', side: 'LEFT', severity: 3, groups: ['upper legs'] },
];

function prescription(catalogId: string) {
  return {
    version: 1,
    sets: [
      {
        exercise: 'Squat gobelet',
        exerciseCatalogId: catalogId,
        sets: 3,
        reps: 12,
        order: 0,
      },
    ],
  };
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 's1',
    date: '2026-09-15T08:00:00.000Z',
    title: 'Renfo bas du corps',
    completed: false,
    strengthPrescription: prescription(UPPER_LEGS_ID),
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
      sessionZoneFlags(session({ strengthPrescription: prescription(SHOULDERS_ID) }), ZONES),
    ).toEqual([]);
  });

  it('says nothing without a prescription or without zones', () => {
    expect(sessionZoneFlags(session({ strengthPrescription: null }), ZONES)).toEqual([]);
    expect(sessionZoneFlags(session(), [])).toEqual([]);
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
