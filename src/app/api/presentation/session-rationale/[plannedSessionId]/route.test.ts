import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { baseProposal } from '@/lib/plan-gate/test-fixtures';

vi.mock('@/lib/queries', () => ({
  getPlannedSessionById: vi.fn(),
}));

vi.mock('@/lib/decision-memory/repository', () => ({
  findDecisionForPlannedSession: vi.fn(),
  findDecisionWithHistory: vi.fn(),
}));

async function importRoute() {
  return await import('./route');
}

const SESSION = {
  id: 'session-1',
  type: 'RUN',
  intensity: 'ENDURANCE',
  durationMin: 60,
  load: 50,
  date: new Date('2026-07-14T08:00:00.000Z'),
  completed: true,
  activityId: 'act-1',
};

function makeDecision(overrides: Record<string, unknown> = {}) {
  return {
    id: 'decision-1',
    athleteId: 'default',
    trainingDayId: '2026-07-14',
    source: 'PLAN_GENERATOR',
    status: 'ACCEPTED',
    proposal: baseProposal({ rationale: 'Construire la base aérobie.' }),
    gateResult: {
      proposal: baseProposal(),
      status: 'ACCEPTED',
      findings: [],
      requiredAssumptions: [],
      saferAlternative: null,
    },
    snapshotContext: {
      confidence: 0.8,
      confidenceTier: 'HIGH',
      overallVerdict: 'TRAIN_SMART',
      limitingFactorSystem: null,
      physicalHealthCapacity: null,
      fatigueTrainingCapacity: null,
    },
    snapshotIdAtRecommendation: 'snap-1',
    createdAt: new Date('2026-07-14T06:00:00.000Z'),
    actions: [
      {
        id: 'action-1',
        decisionId: 'decision-1',
        actionType: 'ACCEPTED',
        occurredAt: new Date('2026-07-14T06:05:00.000Z'),
        source: 'PLAN_REVIEW_UI',
        rationale: null,
        resultingPlannedSessionId: 'session-1',
      },
    ],
    outcome: null,
    ...overrides,
  };
}

describe('GET /api/presentation/session-rationale/[plannedSessionId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    await importRoute();
  });

  it('returns 404 when the planned session does not exist', async () => {
    const { getPlannedSessionById } = await import('@/lib/queries');
    vi.mocked(getPlannedSessionById).mockResolvedValue(null as never);

    const { GET } = await importRoute();
    const response = await GET(new Request('http://localhost/x'), {
      params: Promise.resolve({ plannedSessionId: 'missing' }),
    });

    expect(response.status).toBe(404);
  });

  it('full happy path: generated plan -> accepted session -> completed activity -> EVALUATED outcome', async () => {
    const { getPlannedSessionById } = await import('@/lib/queries');
    const { findDecisionForPlannedSession, findDecisionWithHistory } =
      await import('@/lib/decision-memory/repository');
    vi.mocked(getPlannedSessionById).mockResolvedValue(SESSION as never);
    vi.mocked(findDecisionForPlannedSession).mockResolvedValue({ id: 'decision-1' } as never);
    vi.mocked(findDecisionWithHistory).mockResolvedValue(
      makeDecision({
        outcome: {
          outcomeStatus: 'EVALUATED',
          executionMatch: {
            plannedDurationMin: 60,
            actualDurationSec: 3600,
            plannedLoad: 50,
            actualLoad: 50,
            verdict: 'AS_PLANNED',
            complianceScore: 100,
          },
          subjectiveResponse: null,
          shortTermRecoveryResponse: null,
          safetySignal: null,
          limitations: [],
          confidence: 0.25,
        },
      }) as never,
    );

    const { GET } = await importRoute();
    const response = await GET(new Request('http://localhost/x'), {
      params: Promise.resolve({ plannedSessionId: 'session-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.viewModel.origin).toBe('COACH');
    expect(body.viewModel.suggested.purpose).toBe('Construire la base aérobie.');
    expect(body.viewModel.chosen.executionState).toBe('COMPLETED');
    expect(body.viewModel.outcome.status).toBe('EVALUATED');
  });

  it('modified/overridden session shows the right action-history entry', async () => {
    const { getPlannedSessionById } = await import('@/lib/queries');
    const { findDecisionForPlannedSession, findDecisionWithHistory } =
      await import('@/lib/decision-memory/repository');
    vi.mocked(getPlannedSessionById).mockResolvedValue(SESSION as never);
    vi.mocked(findDecisionForPlannedSession).mockResolvedValue({ id: 'decision-1' } as never);
    vi.mocked(findDecisionWithHistory).mockResolvedValue(
      makeDecision({
        actions: [
          {
            id: 'action-1',
            decisionId: 'decision-1',
            actionType: 'ACCEPTED',
            occurredAt: new Date('2026-07-14T06:05:00.000Z'),
            source: 'PLAN_REVIEW_UI',
            rationale: null,
            resultingPlannedSessionId: 'session-1',
          },
          {
            id: 'action-2',
            decisionId: 'decision-1',
            actionType: 'OVERRIDDEN',
            occurredAt: new Date('2026-07-15T09:00:00.000Z'),
            source: 'CALENDAR_EDIT',
            rationale: null,
            resultingPlannedSessionId: 'session-1',
          },
        ],
      }) as never,
    );

    const { GET } = await importRoute();
    const response = await GET(new Request('http://localhost/x'), {
      params: Promise.resolve({ plannedSessionId: 'session-1' }),
    });
    const body = await response.json();

    expect(body.viewModel.chosen.actionHistory).toHaveLength(2);
    expect(body.viewModel.chosen.actionHistory[1].actionType).toBe('OVERRIDDEN');
  });

  it('insufficient-data outcome renders INCONCLUSIVE wording', async () => {
    const { getPlannedSessionById } = await import('@/lib/queries');
    const { findDecisionForPlannedSession, findDecisionWithHistory } =
      await import('@/lib/decision-memory/repository');
    vi.mocked(getPlannedSessionById).mockResolvedValue(SESSION as never);
    vi.mocked(findDecisionForPlannedSession).mockResolvedValue({ id: 'decision-1' } as never);
    vi.mocked(findDecisionWithHistory).mockResolvedValue(
      makeDecision({
        outcome: {
          outcomeStatus: 'INCONCLUSIVE',
          executionMatch: null,
          subjectiveResponse: null,
          shortTermRecoveryResponse: null,
          safetySignal: null,
          limitations: ['no evidence'],
          confidence: 0,
        },
      }) as never,
    );

    const { GET } = await importRoute();
    const response = await GET(new Request('http://localhost/x'), {
      params: Promise.resolve({ plannedSessionId: 'session-1' }),
    });
    const body = await response.json();

    expect(body.viewModel.outcome.status).toBe('INCONCLUSIVE');
    expect(body.viewModel.outcome.wording).toEqual(['Preuves encore insuffisantes pour conclure.']);
  });

  it('renders the manual degraded state when the session has no origin decision', async () => {
    const { getPlannedSessionById } = await import('@/lib/queries');
    const { findDecisionForPlannedSession, findDecisionWithHistory } =
      await import('@/lib/decision-memory/repository');
    vi.mocked(getPlannedSessionById).mockResolvedValue(SESSION as never);
    vi.mocked(findDecisionForPlannedSession).mockResolvedValue(null);

    const { GET } = await importRoute();
    const response = await GET(new Request('http://localhost/x'), {
      params: Promise.resolve({ plannedSessionId: 'session-1' }),
    });
    const body = await response.json();

    expect(body.viewModel.origin).toBe('MANUAL');
    expect(body.viewModel.suggested).toBeNull();
    expect(findDecisionWithHistory).not.toHaveBeenCalled();
  });
});
