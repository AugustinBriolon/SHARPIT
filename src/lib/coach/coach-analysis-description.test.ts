import { describe, expect, it, vi } from 'vitest';
import {
  hasSubstantialLocalDescription,
  LOCAL_DESCRIPTION_MIN_CHARS,
  resolveAthleteDescription,
} from '@/lib/coach/coach-analysis';

vi.mock('@/lib/ai', () => ({
  COACH_MODEL: 'mock-model',
  coachAnalysisGatewayOptions: {},
}));

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: (config: unknown) => config },
}));

vi.mock('@/lib/queries', () => ({
  getActivePhysicalNotes: vi.fn(),
  getAthleteProfile: vi.fn(),
  getBrickSessions: vi.fn(),
  getPlannedSessionById: vi.fn(),
}));

vi.mock('@/lib/integrations/strava', () => ({
  fetchActivityDetail: vi.fn(),
}));

vi.mock('@/lib/integrations/strava-sync', () => ({
  getValidAccessToken: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    activityStream: { findUnique: vi.fn() },
  },
}));

describe('hasSubstantialLocalDescription', () => {
  it('rejects short or empty notes', () => {
    expect(hasSubstantialLocalDescription(null)).toBe(false);
    expect(hasSubstantialLocalDescription('ok')).toBe(false);
    expect(hasSubstantialLocalDescription(' '.repeat(LOCAL_DESCRIPTION_MIN_CHARS))).toBe(false);
  });

  it('accepts notes at the min length', () => {
    expect(hasSubstantialLocalDescription('x'.repeat(LOCAL_DESCRIPTION_MIN_CHARS))).toBe(true);
  });
});

describe('resolveAthleteDescription', () => {
  it('skips Strava when local notes are substantial', async () => {
    const { fetchActivityDetail } = await import('@/lib/integrations/strava');
    const notes = 'Séance complète : 4x8 min à 90% FTP avec 4 min récup, bien ressenti.';
    expect(notes.length).toBeGreaterThanOrEqual(LOCAL_DESCRIPTION_MIN_CHARS);

    const result = await resolveAthleteDescription({
      source: 'strava',
      stravaId: '123',
      notes,
    } as never);

    expect(result).toBe(notes);
    expect(fetchActivityDetail).not.toHaveBeenCalled();
  });

  it('fetches Strava when local notes are short', async () => {
    const { fetchActivityDetail } = await import('@/lib/integrations/strava');
    const { getValidAccessToken } = await import('@/lib/integrations/strava-sync');
    vi.mocked(getValidAccessToken).mockResolvedValue('token');
    vi.mocked(fetchActivityDetail).mockResolvedValue({
      description: 'Remote Strava detail',
    } as never);

    const result = await resolveAthleteDescription({
      source: 'strava',
      stravaId: '123',
      notes: 'ok',
    } as never);

    expect(result).toBe('Remote Strava detail');
    expect(fetchActivityDetail).toHaveBeenCalled();
  });
});
