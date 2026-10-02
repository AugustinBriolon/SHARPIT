import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchJournalPrefs,
  putJournalPrefs,
  defaultJournalPrefs,
} from '@sharpit/app/lib/journal/journal-prefs';
import {
  fetchDayJournalEntryFromServer,
  persistDayJournalEntryToServer,
} from '@sharpit/app/lib/journal/day-journal';
import { hydrateActivityStatusFromServer } from '@sharpit/app/lib/health/activity-status';
import { warmCoachContext } from '@sharpit/app/lib/coach/warm-coach-context';

/**
 * The web host serves no `/api` route since the host split (ADR-048): every call from the web's
 * code has to reach `api.` with the session as a Bearer, or it silently goes nowhere.
 */
describe('web calls reach the API origin', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_ORIGIN', 'https://api.sharpit.app');
    vi.stubGlobal('Clerk', { loaded: true, session: { getToken: async () => 'session-token' } });
    vi.stubGlobal('window', globalThis);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function lastCall(): { url: string; authorization: string | null } {
    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit | undefined];
    return { url, authorization: new Headers(init?.headers).get('Authorization') };
  }

  it.each([
    ['journal preferences, read', () => fetchJournalPrefs(), '/api/journal-prefs'],
    [
      'journal preferences, write',
      () => putJournalPrefs(defaultJournalPrefs()),
      '/api/journal-prefs',
    ],
    [
      'the day journal, read',
      () => fetchDayJournalEntryFromServer('2026-10-02'),
      '/api/day-journal?day=2026-10-02',
    ],
    [
      'the day journal, write',
      () =>
        persistDayJournalEntryToServer({
          trainingDayId: '2026-10-02',
          factors: {},
          moodLabel: null,
          hydrationMl: null,
          caffeineMg: 0,
          updatedAt: null,
        } as never),
      '/api/day-journal',
    ],
    ['the activity status', () => hydrateActivityStatusFromServer(), '/api/activity-status'],
  ])('%s', async (_, call, path) => {
    await call().catch(() => undefined);

    expect(lastCall()).toEqual({
      url: `https://api.sharpit.app${path}`,
      authorization: 'Bearer session-token',
    });
  });

  it('the coach warm-up', async () => {
    warmCoachContext();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(lastCall().url).toBe('https://api.sharpit.app/api/coach/prepare');
  });
});
