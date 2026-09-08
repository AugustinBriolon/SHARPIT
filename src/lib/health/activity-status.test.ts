import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_STATUS_DEFAULT,
  ACTIVITY_STATUS_IDS,
  activityStatusLabel,
  activityStatusReminderFact,
  emptyActivityStatusStore,
  getActivityStatusStoreServerSnapshot,
  isActivityStatus,
  parseActivityStatusStore,
  resolveActivityStatusStore,
} from './activity-status';

describe('activity-status', () => {
  it('defaults to actif', () => {
    expect(ACTIVITY_STATUS_DEFAULT).toBe('active');
    expect(activityStatusLabel('active')).toBe('Actif');
    expect(ACTIVITY_STATUS_IDS).toEqual(['active', 'paused', 'injured', 'sick']);
  });

  it('accepts known statuses only (no vacation)', () => {
    expect(isActivityStatus('active')).toBe(true);
    expect(isActivityStatus('paused')).toBe(true);
    expect(isActivityStatus('injured')).toBe(true);
    expect(isActivityStatus('sick')).toBe(true);
    expect(isActivityStatus('vacation')).toBe(false);
  });

  it('parses store, migrates vacation → paused, and falls back to actif', () => {
    expect(parseActivityStatusStore(null).status).toBe('active');
    expect(parseActivityStatusStore({ version: 1, status: 'injured' }).status).toBe('injured');
    expect(parseActivityStatusStore({ version: 1, status: 'vacation' }).status).toBe('paused');
    expect(parseActivityStatusStore({ version: 1, status: 'nope' }).status).toBe('active');
    expect(
      parseActivityStatusStore({
        version: 2,
        status: 'sick',
        retention: { kind: 'until_date', untilDate: '2026-09-20' },
        travelId: null,
      }).retention,
    ).toEqual({ kind: 'until_date', untilDate: '2026-09-20' });
  });

  it('resolves expired until_date back to actif', () => {
    const expired = resolveActivityStatusStore(
      {
        version: 2,
        status: 'paused',
        retention: { kind: 'until_date', untilDate: '2026-09-01' },
        travelId: 'travel-1',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      '2026-09-08',
    );
    expect(expired.status).toBe('active');
    expect(expired.travelId).toBeNull();
  });

  it('exposes planning reminders only when not actif', () => {
    expect(activityStatusReminderFact('active')).toBeNull();
    expect(activityStatusReminderFact('paused')).toEqual({
      label: 'Mode',
      value: 'En pause',
      hint: 'Pas de charge volontaire — plan en veille jusqu’à reprise.',
    });
    expect(
      activityStatusReminderFact('sick', { kind: 'until_date', untilDate: '2026-09-15' }),
    ).toEqual({
      label: 'Mode',
      value: 'Malade',
      hint: 'Repos avant la charge — reprendre seulement quand le corps suit. Jusqu’au 15 sept. 2026.',
    });
  });

  it('uses a stable empty store for prerender/server snapshots', () => {
    expect(emptyActivityStatusStore().updatedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(getActivityStatusStoreServerSnapshot()).toContain(
      '"updatedAt":"1970-01-01T00:00:00.000Z"',
    );
  });
});
