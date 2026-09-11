import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EvaluatedExperiment } from '@/lib/journal/journal-habit-experiment';

vi.mock('@/lib/next/await-request', () => ({ awaitRequest: vi.fn() }));
vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));
vi.mock('@/lib/training/training-day', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/training/training-day')>()),
  trainingDayIdForNow: () => '2026-09-10',
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    journalHabitExperiment: {
      create: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));
vi.mock('@/lib/journal/journal-habit-experiment-load', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/journal/journal-habit-experiment-load')>()),
  loadJournalHabitExperiments: vi.fn().mockResolvedValue([]),
}));

function running(): EvaluatedExperiment {
  return {
    id: 'exp-running',
    factorId: 'alcohol',
    intent: 'REMOVE',
    startDayId: '2026-09-08',
    endDayId: '2026-09-14',
    reviewDayId: '2026-09-16',
    status: 'running',
    dayIndex: 3,
    segments: ['held', 'held', 'pending', 'pending', 'pending', 'pending', 'pending'],
    heldDays: 2,
    verdict: null,
    effects: [],
  };
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, { method, body: JSON.stringify(body) }) as never;
}

async function givenExperiments(list: EvaluatedExperiment[]) {
  const { loadJournalHabitExperiments } =
    await import('@/lib/journal/journal-habit-experiment-load');
  vi.mocked(loadJournalHabitExperiments).mockResolvedValue(list);
}

describe('/api/journal/habit-experiments', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await givenExperiments([]);
  });

  it('starts a test today for the signed-in athlete', async () => {
    const { prisma } = await import('@/lib/prisma');
    const { POST } = await import('./route');

    const response = await POST(
      jsonRequest('http://localhost/api/journal/habit-experiments', 'POST', {
        factorId: 'alcohol',
        intent: 'REMOVE',
      }),
    );

    expect(response.status).toBe(201);
    expect(prisma.journalHabitExperiment.create).toHaveBeenCalledWith({
      data: {
        athleteId: 'athlete-1',
        factorId: 'alcohol',
        intent: 'REMOVE',
        startDayId: '2026-09-10',
      },
    });
  });

  it('rejects a factor the journal cannot record', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      jsonRequest('http://localhost/api/journal/habit-experiments', 'POST', {
        factorId: 'drop table',
        intent: 'ADD',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('keeps one lever at a time', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.journalHabitExperiment.findFirst).mockResolvedValueOnce({
      id: 'exp-running',
    } as Awaited<ReturnType<typeof prisma.journalHabitExperiment.findFirst>>);
    const { POST } = await import('./route');
    const { ONE_TEST_AT_A_TIME_MESSAGE } = await import('@/lib/journal/journal-habit-experiment');

    const response = await POST(
      jsonRequest('http://localhost/api/journal/habit-experiments', 'POST', {
        factorId: 'late_meal',
        intent: 'REMOVE',
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: ONE_TEST_AT_A_TIME_MESSAGE });
    expect(prisma.journalHabitExperiment.create).not.toHaveBeenCalled();
  });

  it('stops only a running test of the signed-in athlete', async () => {
    await givenExperiments([running()]);
    const { prisma } = await import('@/lib/prisma');
    const { PATCH } = await import('./[id]/route');
    const context = (id: string) => ({ params: Promise.resolve({ id }) });

    const unknown = await PATCH(
      jsonRequest('http://localhost', 'PATCH', { cancelled: true }),
      context('someone-else'),
    );
    const stopped = await PATCH(
      jsonRequest('http://localhost', 'PATCH', { cancelled: true }),
      context('exp-running'),
    );

    expect(unknown.status).toBe(404);
    expect(stopped.status).toBe(200);
    expect(prisma.journalHabitExperiment.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.journalHabitExperiment.updateMany).toHaveBeenCalledWith({
      where: { id: 'exp-running', athleteId: 'athlete-1', cancelledAt: null },
      data: { cancelledAt: expect.any(Date) },
    });
  });
});
