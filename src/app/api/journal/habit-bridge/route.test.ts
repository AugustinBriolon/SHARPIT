import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));

vi.mock('@/lib/health/journal-habit-analysis-load', () => ({
  loadJournalHabitFindings: vi.fn(),
}));

vi.mock('@/lib/health/journal-habit-today-bridge', () => ({
  buildTodayJournalHabitBridge: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

vi.mock('@/lib/next/await-request', () => ({
  awaitRequest: vi.fn().mockResolvedValue(undefined),
}));

async function importRoute() {
  return await import('./route');
}

describe('GET /api/journal/habit-bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns bridge payload from findings', async () => {
    const { loadJournalHabitFindings } = await import('@/lib/health/journal-habit-analysis-load');
    const { buildTodayJournalHabitBridge } =
      await import('@/lib/health/journal-habit-today-bridge');
    vi.mocked(loadJournalHabitFindings).mockResolvedValue({
      daysWithSignal: 14,
      findings: [],
    } as never);
    vi.mocked(buildTodayJournalHabitBridge).mockReturnValue({
      sourceLabel: 'Journal',
      habitLabel: 'Écran au lit',
      meaning: 'Associé à un sommeil plus court',
      disclaimer: 'Association, pas cause',
      confidenceNote: 'Association nette',
      ctaLabel: 'Voir l’analyse',
      polarity: 'minus',
      confidence: 'high',
      factorId: 'screen',
      href: '/journal/analyses',
    });

    const { GET } = await importRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.bridge).toMatchObject({
      habitLabel: 'Écran au lit',
      href: '/journal/analyses',
    });
  });

  it('returns bridge null when silent', async () => {
    const { loadJournalHabitFindings } = await import('@/lib/health/journal-habit-analysis-load');
    const { buildTodayJournalHabitBridge } =
      await import('@/lib/health/journal-habit-today-bridge');
    vi.mocked(loadJournalHabitFindings).mockResolvedValue({
      daysWithSignal: 2,
      findings: [],
    } as never);
    vi.mocked(buildTodayJournalHabitBridge).mockReturnValue(null);

    const { GET } = await importRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.bridge).toBeNull();
  });

  it('returns 500 when load fails', async () => {
    const { loadJournalHabitFindings } = await import('@/lib/health/journal-habit-analysis-load');
    vi.mocked(loadJournalHabitFindings).mockRejectedValue(new Error('db down'));

    const { GET } = await importRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toMatch(/pont journal/i);
  });
});
