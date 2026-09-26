import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    convertToModelMessages: vi.fn().mockResolvedValue([]),
    streamText: vi.fn(() => ({ stream: new ReadableStream() })),
    toUIMessageStream: vi.fn(() => new ReadableStream()),
    createUIMessageStreamResponse: vi.fn(
      ({ headers }: { headers?: HeadersInit }) => new Response('stream', { headers }),
    ),
  };
});

vi.mock('@sharpit/server/lib/ai', () => ({
  COACH_MODEL: 'mock-model',
  COACH_MAX_OUTPUT_TOKENS: { conversational: 1 },
  COACH_REASONING_LEVEL: { conversational: 'low' },
  coachGatewayOptions: {},
  isCoachConfigured: () => true,
}));

vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));

vi.mock('@sharpit/server/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  rateLimitJsonResponse: vi.fn(),
  rateLimiters: { coachChat: {} },
}));

// Mocked wholesale — ai-budget.ts imports @/lib/prisma, which must not run here.
vi.mock('@sharpit/server/lib/access/ai-budget', () => ({
  ensureFreeAiBudget: vi
    .fn()
    .mockResolvedValue({ allowed: true, isPro: false, warning: false, retryAfterSeconds: null }),
  aiBudgetResponseBody: vi.fn(),
  withAiBudgetWarningHeader: (headers: Record<string, string>) => headers,
  RETRY_AFTER_HEADER: 'Retry-After',
}));

vi.mock('@sharpit/server/lib/privacy/consent-store', () => ({
  requireAiProcessingConsent: vi.fn().mockResolvedValue(null),
}));

vi.mock('@sharpit/server/lib/coach/context/coach-context', () => ({
  buildCoachContext: vi.fn().mockResolvedValue({ practicedSports: [] }),
  formatCoachContext: () => 'mock coach context',
}));

vi.mock('@sharpit/server/lib/coach/plan/calendar-availability', () => ({
  buildBusySummary: vi.fn().mockResolvedValue(null),
}));

vi.mock('@sharpit/server/lib/coach/chat/tools/coach-tools', () => ({
  createCoachTools: vi.fn(() => ({})),
}));

vi.mock('@sharpit/server/lib/ai/usage', () => ({
  recordAiUsage: vi.fn(),
}));

vi.mock('@sharpit/server/lib/planned-session/strength/strength-session-template', () => ({
  formatStrengthSessionRules: () => '',
}));

vi.mock('@sharpit/server/lib/queries', () => ({
  getAthleteProfile: vi.fn(),
  getGoalById: vi.fn(),
}));

vi.mock('@sharpit/db/client', () => ({ prisma: {} }));

vi.mock('@sharpit/server/lib/journal/journal-habit-analysis-load', () => ({
  loadJournalHabitFindings: vi.fn().mockResolvedValue({ daysWithSignal: 3, findings: [] }),
}));

async function importRoute() {
  return await import('./handler');
}

function chatRequest(metadata?: Record<string, unknown>): Request {
  return new Request('http://localhost/api/coach/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [
        {
          id: 'm-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Que dit mon journal ?' }],
          ...(metadata ? { metadata } : {}),
        },
      ],
    }),
  });
}

async function givenTier(tier: 'FREE' | 'PRO') {
  const { getAthleteProfile } = await import('@sharpit/server/lib/queries');
  vi.mocked(getAthleteProfile).mockResolvedValue({ tier } as never);
}

async function systemPromptSent(): Promise<string> {
  const { streamText } = await import('ai');
  const [call] = vi.mocked(streamText).mock.calls;
  return (call?.[0] as { system: string }).system;
}

describe('POST /api/coach/chat · journal analyses gate', () => {
  beforeAll(async () => {
    await importRoute();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuses a FREE athlete before loading any journal finding', async () => {
    await givenTier('FREE');
    const { streamText } = await import('ai');
    const { loadJournalHabitFindings } =
      await import('@sharpit/server/lib/journal/journal-habit-analysis-load');

    const { POST } = await importRoute();
    const response = await POST(chatRequest({ discussKind: 'journal-analyses' }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'La lecture coach du journal est réservée à Pro.',
    });
    expect(loadJournalHabitFindings).not.toHaveBeenCalled();
    expect(streamText).not.toHaveBeenCalled();
  });

  it('hands a PRO athlete’s journal reading to the coach', async () => {
    await givenTier('PRO');

    const { POST } = await importRoute();
    const response = await POST(chatRequest({ discussKind: 'journal-analyses' }));

    expect(response.status).toBe(200);
    const system = await systemPromptSent();
    expect(system).toContain('## Analyses journal');
    expect(system).toContain('3/7 jours avec signal');
  });

  it('leaves ordinary conversations untouched and skips the tier lookup', async () => {
    const { getAthleteProfile } = await import('@sharpit/server/lib/queries');

    const { POST } = await importRoute();
    const response = await POST(chatRequest());

    expect(response.status).toBe(200);
    expect(getAthleteProfile).not.toHaveBeenCalled();
    expect(await systemPromptSent()).not.toContain('## Analyses journal');
  });
});

describe('POST /api/coach/chat · discuss target context', () => {
  const race = {
    title: 'Half Ironman',
    kind: 'RACE',
    targetDate: null,
    location: 'Vichy',
    achieved: false,
    notes: null,
    priority: 'A',
    raceFormat: null,
    targetPerformance: null,
    currentValue: null,
    targetValue: null,
    unit: null,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getGoalById } = await import('@sharpit/server/lib/queries');
    // Mirrors the real query: the goal is only found under its owner's id.
    vi.mocked(getGoalById).mockImplementation((async (athleteId: string, id: string) =>
      athleteId === 'athlete-1' && id === 'g-1' ? race : null) as never);
  });

  it('names the discussed goal in the system prompt', async () => {
    const { getGoalById } = await import('@sharpit/server/lib/queries');

    const { POST } = await importRoute();
    const response = await POST(chatRequest({ discussKind: 'goal', goalId: 'g-1' }));

    expect(response.status).toBe(200);
    expect(getGoalById).toHaveBeenCalledWith('athlete-1', 'g-1');
    const system = await systemPromptSent();
    expect(system).toContain('## Objectif discuté');
    expect(system).toContain('Course : Half Ironman (Vichy)');
  });

  it('adds nothing for a goal the athlete does not own', async () => {
    const { POST } = await importRoute();
    const response = await POST(chatRequest({ discussKind: 'goal', goalId: 'g-foreign' }));

    expect(response.status).toBe(200);
    expect(await systemPromptSent()).not.toContain('## Objectif discuté');
  });

  it('treats malformed discuss metadata as an ordinary conversation', async () => {
    const { getGoalById, getAthleteProfile } = await import('@sharpit/server/lib/queries');

    const { POST } = await importRoute();
    const response = await POST(chatRequest({ discussKind: 'goal', goalId: ['g-1'] }));

    expect(response.status).toBe(200);
    expect(getGoalById).not.toHaveBeenCalled();
    expect(getAthleteProfile).not.toHaveBeenCalled();
  });
});
