import { describe, expect, it } from 'vitest';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import type { ThreadEntry } from './thread-model';
import { groupThreadDayEntries } from './thread-brick-groups';

function plannedEntry(
  id: string,
  partial: Partial<ClientPlannedSession> = {},
  kind: ThreadEntry['kind'] = 'planned',
): ThreadEntry {
  const planned = {
    id,
    type: 'RUN',
    durationMin: 30,
    brickGroupId: null,
    brickOrder: null,
    ...partial,
  } as ClientPlannedSession;
  return {
    id,
    dayKey: '2026-08-26',
    type: planned.type,
    title: 'Séance',
    kind,
    activity: null,
    planned,
  };
}

function doneEntry(id: string, partial: Partial<ClientActivity> = {}): ThreadEntry {
  return {
    id,
    dayKey: '2026-08-26',
    type: 'RUN',
    title: 'Séance',
    kind: 'done',
    activity: { id, type: 'RUN', ...partial } as ClientActivity,
    planned: null,
  };
}

describe('groupThreadDayEntries', () => {
  it('keeps sessions without a brick as single entries', () => {
    const entries = [plannedEntry('p1'), doneEntry('a1')];
    const items = groupThreadDayEntries(entries);

    expect(items).toEqual([
      { kind: 'single', entry: entries[0] },
      { kind: 'single', entry: entries[1] },
    ]);
  });

  it('groups legs sharing a brickGroupId, ordered by brickOrder', () => {
    const bike = plannedEntry('leg-bike', { type: 'BIKE', brickGroupId: 'brick-1', brickOrder: 1 });
    const run = plannedEntry('leg-run', { type: 'RUN', brickGroupId: 'brick-1', brickOrder: 0 });
    const items = groupThreadDayEntries([bike, run]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'brick', id: 'brick-1' });
    if (items[0].kind === 'brick') {
      expect(items[0].entries.map((e) => e.id)).toEqual(['leg-run', 'leg-bike']);
    }
  });

  it('still groups a leg that was already realized and linked to its activity', () => {
    // A completed leg surfaces as `paired`, carrying the planned session's brick
    // fields through `activity.plannedSession` — it must not fall out of the group.
    const realizedLeg = plannedEntry(
      'act-run',
      { id: 'leg-run', type: 'RUN', brickGroupId: 'brick-1', brickOrder: 0 },
      'paired',
    );
    const outstandingLeg = plannedEntry('leg-bike', {
      type: 'BIKE',
      brickGroupId: 'brick-1',
      brickOrder: 1,
    });

    const items = groupThreadDayEntries([realizedLeg, outstandingLeg]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'brick', id: 'brick-1' });
  });
});
