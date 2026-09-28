import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const writes = vi.hoisted(() => ({
  created: [] as unknown[],
  patched: [] as { id: string; body: unknown }[],
  removed: [] as string[],
  existing: new Map<string, unknown>(),
}));

vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));
vi.mock('@sharpit/server/lib/queries', () => ({
  getPlannedSessionById: vi.fn(async (_a: string, id: string) => writes.existing.get(id) ?? null),
}));
vi.mock('@sharpit/server/handlers/coach/adapt/handler', () => ({
  loadAdaptDefaultGoalId: vi.fn().mockResolvedValue('goal-1'),
}));
vi.mock('@sharpit/server/handlers/planned-sessions/handler', () => ({
  createPlannedSessionFromBody: vi.fn(async (_a: string, body: unknown) => {
    writes.created.push(body);
    return { session: { id: 'new' } };
  }),
}));
vi.mock('@sharpit/server/handlers/planned-sessions/[id]/handler', () => ({
  patchPlannedSessionFromBody: vi.fn(async (_a: string, id: string, body: unknown) => {
    writes.patched.push({ id, body });
    return { session: { id } };
  }),
  deletePlannedSessionWithEvent: vi.fn(async (_a: string, id: string) => {
    writes.removed.push(id);
  }),
}));

function change(overrides: Record<string, unknown>) {
  return {
    action: 'MODIFY',
    sessionId: 's1',
    date: null,
    type: null,
    intensity: null,
    title: null,
    description: null,
    durationMin: null,
    load: null,
    reason: 'Fatigue.',
    decisionId: null,
    ...overrides,
  };
}

async function apply(changes: unknown[]) {
  const { POST } = await import('./handler');
  return POST(
    new NextRequest('http://localhost/api/v1/coach/adapt/apply', {
      method: 'POST',
      body: JSON.stringify({ changes }),
    }),
  );
}

describe('POST /api/v1/coach/adapt/apply', () => {
  beforeEach(() => {
    writes.created = [];
    writes.patched = [];
    writes.removed = [];
    writes.existing = new Map([
      ['s1', { id: 's1', type: 'RUN', description: 'Seuil', intensity: 'THRESHOLD' }],
      ['s2', { id: 's2', type: 'BIKE', description: 'Longue', intensity: 'ENDURANCE' }],
    ]);
  });

  it('adds with the coach’s steps, modifies and removes, in the order given', async () => {
    const response = await apply([
      change({ intensity: 'ENDURANCE', durationMin: 40 }),
      change({ action: 'REMOVE', sessionId: 's2' }),
      change({
        action: 'ADD',
        sessionId: null,
        date: '2026-10-01',
        type: 'RUN',
        intensity: 'RECOVERY',
        title: 'Footing',
        durationMin: 30,
        load: 20,
        endurancePrescription: {
          blocks: [{ steps: [{ kind: 'interval', minutes: 30, effort: 'RECOVERY' }] }],
        },
      }),
    ]);

    expect(response.status).toBe(200);
    expect(writes.patched.map((p) => p.id)).toEqual(['s1']);
    expect(writes.removed).toEqual(['s2']);
    const [added] = writes.created as { endurancePrescription: unknown; goalId: string }[];
    expect(added.endurancePrescription).toBeTruthy();
    expect(added.goalId).toBe('goal-1');
  });

  it('writes nothing when a session to adjust is gone', async () => {
    const response = await apply([
      change({ sessionId: 'gone' }),
      change({ action: 'REMOVE', sessionId: 's2' }),
    ]);
    expect(response.status).toBe(409);
    expect(writes.removed).toEqual([]);
    expect(writes.patched).toEqual([]);
  });

  it('refuses a malformed change', async () => {
    expect((await apply([{ action: 'SHUFFLE' }])).status).toBe(400);
  });
});
