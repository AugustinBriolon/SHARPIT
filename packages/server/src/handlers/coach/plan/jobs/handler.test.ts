import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const state = vi.hoisted(() => ({
  afterCallbacks: [] as (() => Promise<void>)[],
  updates: [] as Record<string, unknown>[],
  pushes: [] as unknown[],
  generation: null as null | (() => Promise<unknown>),
}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    after: (callback: () => Promise<void>) => state.afterCallbacks.push(callback),
  };
});

vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));

vi.mock('@sharpit/server/handlers/coach/plan/handler', () => ({
  preparePlanRequest: vi.fn(async () => ({
    ok: true,
    athleteId: 'athlete-1',
    prepared: { goalId: 'goal-1', prompt: 'p', start: new Date(), budgetWarning: false },
  })),
  generatePlan: vi.fn(
    async (
      _athleteId: string,
      _prepared: unknown,
      progress: { onPartial: (v: unknown) => void },
    ) => {
      progress.onPartial({ sessions: [{ title: 'Footing' }] });
      return state.generation!();
    },
  ),
}));

vi.mock('@sharpit/server/lib/coach/plan/plan-jobs', () => ({
  isPlanJobStoreConfigured: () => true,
  createPlanJob: vi.fn(async () => ({ id: 'job-1', status: 'running', drafts: [] })),
  updatePlanJob: vi.fn(async (_athleteId: string, _id: string, patch: Record<string, unknown>) => {
    state.updates.push(patch);
  }),
  getPlanJob: vi.fn(async (_athleteId: string, id: string) =>
    id === 'job-1' ? { id, status: 'ready' } : null,
  ),
  getLatestPlanJob: vi.fn(async () => ({ id: 'job-1', status: 'running' })),
}));

vi.mock('@sharpit/server/lib/push/athlete-push', () => ({
  sendPushToAthlete: vi.fn(async (_athleteId: string, payload: unknown) => {
    state.pushes.push(payload);
    return { sent: 1, failed: 0, deactivated: 0 };
  }),
}));

const request = () =>
  new NextRequest('https://api.sharpit.app/api/v1/coach/plan/jobs', { method: 'POST', body: '{}' });

describe('background plan generation', () => {
  beforeEach(() => {
    state.afterCallbacks = [];
    state.updates = [];
    state.pushes = [];
  });

  it('answers at once, then stores the week and tells the athlete it is ready', async () => {
    state.generation = async () => ({ sessions: [{ title: 'Footing' }, { title: 'Seuil' }] });
    const { POST } = await import('./handler');

    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ job: { id: 'job-1', status: 'running' } });

    await state.afterCallbacks[0]!();
    expect(state.updates.at(-1)).toMatchObject({ status: 'ready' });
    expect(state.pushes[0]).toMatchObject({
      url: '/plan/generator',
      aps: { alert: { title: 'Ta semaine est prête' } },
    });
  });

  it('stores why a generation failed, and sends no push', async () => {
    state.generation = async () => {
      throw new Error('No object generated: response did not match schema.');
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { POST } = await import('./handler');

    await POST(request());
    await state.afterCallbacks[0]!();

    expect(state.updates.at(-1)).toMatchObject({ status: 'failed' });
    expect(String(state.updates.at(-1)?.error)).toContain('proposition incomplète');
    expect(state.pushes).toHaveLength(0);
  });

  it('reads a job back by id', async () => {
    const { getJob } = await import('./handler');
    const found = await getJob(request(), { params: Promise.resolve({ id: 'job-1' }) });
    const missing = await getJob(request(), { params: Promise.resolve({ id: 'nope' }) });
    expect(found.status).toBe(200);
    expect(missing).toBeInstanceOf(NextResponse);
    expect(missing.status).toBe(404);
  });
});
