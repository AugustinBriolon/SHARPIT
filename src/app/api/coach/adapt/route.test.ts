import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { decisionState, physicalHealthData } from '@/lib/plan-gate/test-fixtures';
import { consumeCoachProgressStream } from '@/lib/coach/chat/coach-progress-stream';
import type { AdaptPayload } from './route';

vi.mock('@/lib/ai', () => ({
  COACH_MODEL: 'mock-model',
  coachGatewayOptions: {},
  isCoachConfigured: () => true,
}));

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('default'),
}));

vi.mock('@/lib/coach/stream-structured-generation', () => ({
  runStructuredCoachStream: vi.fn(),
}));

vi.mock('@/lib/coach/context/coach-context', () => ({
  buildCoachContext: vi.fn().mockResolvedValue({}),
  formatCoachContext: () => 'mock coach context',
}));

vi.mock('@/lib/integrations/google/google-sync', () => ({
  getUpcomingBusy: vi.fn().mockResolvedValue([]),
  getGoogleAccount: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/queries', () => ({
  getGoalById: vi.fn().mockResolvedValue(null),
  getGoals: vi.fn().mockResolvedValue([]),
  getActivitiesList: vi.fn().mockResolvedValue([]),
  getPlannedSessions: vi.fn().mockResolvedValue([]),
  getPlannedSessionsForCoach: vi.fn().mockResolvedValue([]),
  getActiveTrainingPlan: vi.fn().mockResolvedValue(null),
  getAthleteProfile: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/training/pmc-server', () => ({
  loadAthletePmcAnchor: vi.fn().mockResolvedValue(null),
  loadDailyTrainingStressEntries: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/athlete-state/snapshot-service', () => ({
  getOrBuildAthleteSnapshot: vi.fn(),
}));

vi.mock('@/lib/decision-memory/repository', () => ({
  createCoachingDecision: vi.fn().mockResolvedValue({ id: 'mock-decision-id' }),
}));

async function importRoute() {
  return await import('./route');
}

describe('POST /api/coach/adapt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    await importRoute();
  });

  /** The route short-circuits when nothing is planned, so gate tests need a session. */
  async function givenUpcomingSession() {
    const { getPlannedSessionsForCoach } = await import('@/lib/queries');
    vi.mocked(getPlannedSessionsForCoach).mockResolvedValue([
      {
        id: 'existing-1',
        date: new Date('2026-07-20T00:00:00Z'),
        type: 'RUN',
        intensity: 'ENDURANCE',
        durationMin: 45,
        load: 40,
        title: 'Footing',
        completed: false,
        brickGroupId: null,
      },
    ] as never);
  }

  it('answers without calling the model when nothing is planned in the window', async () => {
    const { runStructuredCoachStream } = await import('@/lib/coach/stream-structured-generation');
    const { getPlannedSessionsForCoach } = await import('@/lib/queries');
    vi.mocked(getPlannedSessionsForCoach).mockResolvedValue([] as never);

    const { POST } = await importRoute();
    const response = await POST(
      new Request('http://localhost/api/coach/adapt', { method: 'POST', body: JSON.stringify({}) }),
    );
    const body = await consumeCoachProgressStream<AdaptPayload, unknown>(response);

    expect(body.changes).toHaveLength(0);
    expect(body.summary).toMatch(/rien à réadapter/i);
    // The whole point: no generation is paid for when there is nothing to adapt.
    expect(runStructuredCoachStream).not.toHaveBeenCalled();
  });

  it('does not gate REMOVE changes — they pass through with no gate entry', async () => {
    const { runStructuredCoachStream } = await import('@/lib/coach/stream-structured-generation');
    const { getOrBuildAthleteSnapshot } = await import('@/lib/athlete-state/snapshot-service');
    await givenUpcomingSession();

    vi.mocked(runStructuredCoachStream).mockResolvedValue({
      summary: 'Suppression d’une séance en trop',
      changes: [
        {
          action: 'REMOVE',
          sessionId: 'existing-1',
          date: null,
          type: null,
          intensity: null,
          title: null,
          description: null,
          durationMin: null,
          load: null,
          reason: 'Fatigue élevée cette semaine',
        },
      ],
    } as never);

    vi.mocked(getOrBuildAthleteSnapshot).mockResolvedValue({
      decision: decisionState(),
      physicalHealth: physicalHealthData(),
      fatigue: { trainingCapacity: 'FULL' },
    } as never);

    const { POST } = await importRoute();
    const response = await POST(
      new Request('http://localhost/api/coach/adapt', { method: 'POST', body: JSON.stringify({}) }),
    );
    const body = await consumeCoachProgressStream<AdaptPayload, unknown>(response);

    expect(response.status).toBe(200);
    expect(body.changes).toHaveLength(1);
    expect(body.changes[0].action).toBe('REMOVE');
    expect(body.gate.sessions).toHaveLength(0);
    // getOrBuildAthleteSnapshot never called — no ADD/MODIFY proposals to gate.
    expect(getOrBuildAthleteSnapshot).not.toHaveBeenCalled();
  });

  it('gates an ADD change and rejects it when fatigue capacity is REST_ONLY', async () => {
    const { runStructuredCoachStream } = await import('@/lib/coach/stream-structured-generation');
    const { getOrBuildAthleteSnapshot } = await import('@/lib/athlete-state/snapshot-service');
    await givenUpcomingSession();

    vi.mocked(runStructuredCoachStream).mockResolvedValue({
      summary: 'Ajout d’une séance de seuil',
      changes: [
        {
          action: 'ADD',
          sessionId: null,
          date: '2026-07-20',
          type: 'BIKE',
          intensity: 'THRESHOLD',
          title: 'Seuil vélo',
          description: null,
          durationMin: 60,
          load: 75,
          reason: 'Combler le trou de la semaine',
        },
      ],
    } as never);

    vi.mocked(getOrBuildAthleteSnapshot).mockResolvedValue({
      snapshotId: 'snap-adapt-1',
      confidence: 0.8,
      decision: decisionState(),
      physicalHealth: physicalHealthData(),
      fatigue: { trainingCapacity: 'REST_ONLY' },
      todaysDecision: 'TRAIN_SMART',
    } as never);

    const { POST } = await importRoute();
    const response = await POST(
      new Request('http://localhost/api/coach/adapt', { method: 'POST', body: JSON.stringify({}) }),
    );
    const body = await consumeCoachProgressStream<AdaptPayload, unknown>(response);

    expect(response.status).toBe(200);
    expect(body.gate.sessions).toHaveLength(1);
    expect(body.gate.sessions[0].status).toBe('REJECTED');
    expect(
      body.gate.sessions[0].findings.some(
        (f: { ruleCode: string }) => f.ruleCode === 'FATIGUE_REST_ONLY',
      ),
    ).toBe(true);
    // A CoachingDecision is persisted for the gated ADD change, and its id is attached
    // to the matching entry in the response's `changes` array.
    expect(body.changes[0].decisionId).toBe('mock-decision-id');
  });

  it('resolves a MODIFY proposal by merging the change onto the existing session for date-dependent rules', async () => {
    const { runStructuredCoachStream } = await import('@/lib/coach/stream-structured-generation');
    const { getOrBuildAthleteSnapshot } = await import('@/lib/athlete-state/snapshot-service');
    const { getPlannedSessionsForCoach } = await import('@/lib/queries');

    vi.mocked(getPlannedSessionsForCoach).mockResolvedValue([
      {
        id: 'existing-1',
        date: new Date('2026-07-10T00:00:00Z'),
        type: 'RUN',
        intensity: 'ENDURANCE',
        durationMin: 45,
        load: 40,
        title: 'Footing',
        completed: false,
        brickGroupId: null,
      },
    ] as never);

    vi.mocked(runStructuredCoachStream).mockResolvedValue({
      summary: 'Allègement de la charge',
      changes: [
        {
          action: 'MODIFY',
          sessionId: 'existing-1',
          date: null,
          type: null,
          intensity: null,
          title: null,
          description: null,
          durationMin: null,
          load: 15,
          reason: 'Fatigue accrue après la dernière séance',
        },
      ],
    } as never);

    vi.mocked(getOrBuildAthleteSnapshot).mockResolvedValue({
      snapshotId: 'snap-adapt-2',
      confidence: 0.8,
      decision: decisionState(),
      physicalHealth: physicalHealthData(),
      fatigue: { trainingCapacity: 'FULL' },
      todaysDecision: 'TRAIN_SMART',
    } as never);

    const { POST } = await importRoute();
    const response = await POST(
      new Request('http://localhost/api/coach/adapt', { method: 'POST', body: JSON.stringify({}) }),
    );
    const body = await consumeCoachProgressStream<AdaptPayload, unknown>(response);

    expect(response.status).toBe(200);
    expect(body.gate.sessions).toHaveLength(1);
    // The past date on the existing session (2026-07-10) must not trigger PAST_DATE —
    // MODIFY only changes load; the rule must resolve the *effective* date correctly
    // without treating the existing session's own date as a new proposal in the past.
    expect(body.gate.sessions[0].proposal.date).toBe('2026-07-10');
  });

  it('carries an authored endurance structure onto the gated proposal', async () => {
    const { runStructuredCoachStream } = await import('@/lib/coach/stream-structured-generation');
    const { getOrBuildAthleteSnapshot } = await import('@/lib/athlete-state/snapshot-service');
    const { createCoachingDecision } = await import('@/lib/decision-memory/repository');
    await givenUpcomingSession();

    vi.mocked(runStructuredCoachStream).mockResolvedValue({
      summary: 'Structurer la séance de seuil',
      changes: [
        {
          action: 'ADD',
          sessionId: null,
          date: '2026-07-20',
          type: 'RUN',
          intensity: 'THRESHOLD',
          title: '5×5 min seuil',
          description: null,
          durationMin: 60,
          load: 70,
          reason: 'Bloc qualité de la semaine',
          endurancePrescription: {
            blocks: [
              { steps: [{ kind: 'warmup', minutes: 15 }] },
              {
                times: 5,
                steps: [
                  { kind: 'interval', minutes: 5, effort: 'THRESHOLD' },
                  { kind: 'recovery', minutes: 2 },
                ],
              },
            ],
          },
        },
      ],
    } as never);

    vi.mocked(getOrBuildAthleteSnapshot).mockResolvedValue({
      snapshotId: 'snap-adapt-2',
      confidence: 0.8,
      decision: decisionState(),
      physicalHealth: physicalHealthData(),
      fatigue: { trainingCapacity: 'FULL' },
      todaysDecision: 'TRAIN_SMART',
    } as never);

    const { POST } = await importRoute();
    const body = await consumeCoachProgressStream<AdaptPayload, unknown>(
      await POST(
        new Request('http://localhost/api/coach/adapt', {
          method: 'POST',
          body: JSON.stringify({}),
        }),
      ),
    );

    expect(body.changes[0].endurancePrescription?.blocks).toHaveLength(2);
    const [[, call]] = vi.mocked(createCoachingDecision).mock.calls;
    expect(call.proposal.endurancePrescription?.blocks?.[1]?.times).toBe(5);
  });

  it('persists a CoachingDecision even for a REJECTED proposal, preserving the exact gate result', async () => {
    const { runStructuredCoachStream } = await import('@/lib/coach/stream-structured-generation');
    const { getOrBuildAthleteSnapshot } = await import('@/lib/athlete-state/snapshot-service');
    const { createCoachingDecision } = await import('@/lib/decision-memory/repository');

    vi.mocked(runStructuredCoachStream).mockResolvedValue({
      summary: 'Ajout',
      changes: [
        {
          action: 'ADD',
          sessionId: null,
          date: '2026-07-20',
          type: 'RUN',
          intensity: 'VO2MAX',
          title: 'VO2max',
          description: null,
          durationMin: 40,
          load: 65,
          reason: 'Test',
        },
      ],
    } as never);

    vi.mocked(getOrBuildAthleteSnapshot).mockResolvedValue({
      snapshotId: 'snap-adapt-3',
      confidence: 0.9,
      decision: decisionState({ overallVerdict: 'CAUTION' }),
      physicalHealth: physicalHealthData(),
      fatigue: { trainingCapacity: 'FULL' },
      todaysDecision: 'CAUTION',
    } as never);

    const { POST } = await importRoute();
    // The route answers with a stream: the Gate and the decision writes only run
    // once it is drained, so consume it before asserting on the side effects.
    await consumeCoachProgressStream(
      await POST(
        new Request('http://localhost/api/coach/adapt', {
          method: 'POST',
          body: JSON.stringify({}),
        }),
      ),
    );

    expect(createCoachingDecision).toHaveBeenCalledTimes(1);
    const [[, call]] = vi.mocked(createCoachingDecision).mock.calls;
    expect(call.source).toBe('PLAN_ADAPTER');
    expect(call.gateResult.status).toBe('REJECTED');
    expect(call.snapshotIdAtRecommendation).toBe('snap-adapt-3');
  });
});
