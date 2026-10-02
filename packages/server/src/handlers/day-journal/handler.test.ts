import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@sharpit/app/lib/next/await-request', () => ({ awaitRequest: vi.fn() }));
vi.mock('@sharpit/db/client', () => ({ prisma: {} }));
vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));
vi.mock('@sharpit/server/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  rateLimitJsonResponse: vi.fn(() => ({ body: { error: 'Trop de requêtes' }, status: 429 })),
  rateLimiters: { dayJournal: {} },
}));
vi.mock('@sharpit/server/lib/journal/day-journal-service', () => ({
  getDayJournalEntry: vi.fn(),
  upsertDayJournalEntryDb: vi.fn(),
}));

const URL = 'https://api.sharpit.app/api/v1/day-journal';

function put(body: string) {
  return new NextRequest(URL, { method: 'PUT', body });
}

const service = () => import('@sharpit/server/lib/journal/day-journal-service');
const rateLimit = () => import('@sharpit/server/lib/rate-limit');

describe('PUT /api/v1/day-journal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('saves a valid day', async () => {
    const { PUT } = await import('./handler');
    vi.mocked((await service()).upsertDayJournalEntryDb).mockResolvedValue({
      trainingDayId: '2026-10-02',
    } as never);

    const response = await PUT(
      put(
        JSON.stringify({
          trainingDayId: '2026-10-02',
          factors: { alcohol: 'yes' },
          caffeineMg: 80,
        }),
      ),
    );

    expect(response.status).toBe(200);
  });

  it('answers 400 to a body that is not JSON, without a server error', async () => {
    const { PUT } = await import('./handler');

    const response = await PUT(put('{not json'));

    expect(response.status).toBe(400);
    expect((await service()).upsertDayJournalEntryDb).not.toHaveBeenCalled();
  });

  it('answers 422 naming the fields, never their values', async () => {
    const { PUT } = await import('./handler');

    const response = await PUT(
      put(
        JSON.stringify({ trainingDayId: '2026-10-02', moodLabel: 'x'.repeat(65), caffeineMg: -1 }),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.fields).toEqual(expect.arrayContaining(['moodLabel', 'caffeineMg']));
    expect(JSON.stringify(body)).not.toContain('xxxx');
  });

  it('refuses a factor id that is not one', async () => {
    const { PUT } = await import('./handler');

    const response = await PUT(
      put(JSON.stringify({ trainingDayId: '2026-10-02', factors: { 'DROP TABLE': 'yes' } })),
    );

    expect(response.status).toBe(422);
  });

  it('answers 429 with Retry-After once the athlete is over the limit', async () => {
    const { PUT } = await import('./handler');
    vi.mocked((await rateLimit()).checkRateLimit).mockResolvedValueOnce({
      ok: false,
      cause: 'limited',
      retryAfterSeconds: 12,
    });

    const response = await PUT(put(JSON.stringify({ trainingDayId: '2026-10-02' })));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('12');
  });

  it('logs a failure without the journal body', async () => {
    const { PUT } = await import('./handler');
    vi.mocked((await service()).upsertDayJournalEntryDb).mockRejectedValue(new Error('boom'));

    const response = await PUT(
      put(JSON.stringify({ trainingDayId: '2026-10-02', moodLabel: 'Fatigué' })),
    );

    expect(response.status).toBe(500);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('Fatigué');
  });
});
