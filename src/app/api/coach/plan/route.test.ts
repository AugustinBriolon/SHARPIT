import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { consumeCoachProgressStream } from '@/lib/coach/chat/coach-progress-stream';
import type { PlanPayload } from './route';
import { decisionState, physicalHealthData } from '@/lib/plan-gate/test-fixtures';

vi.mock('@/lib/ai', () => ({
  COACH_MODEL: 'mock-model',
  coachGatewayOptions: {},
  isCoachConfigured: () => true,
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
  getActivitiesList: vi.fn().mockResolvedValue([]),
  getPlannedSessions: vi.fn().mockResolvedValue([]),
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

describe('POST /api/coach/plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    await importRoute();
  });

  it('includes a gate field reflecting a REJECTED verdict when the proposed session conflicts with DecisionState', async () => {
    const { runStructuredCoachStream } = await import('@/lib/coach/stream-structured-generation');
    const { getOrBuildAthleteSnapshot } = await import('@/lib/athlete-state/snapshot-service');

    vi.mocked(runStructuredCoachStream).mockResolvedValue({
      summary: 'Bloc de reprise',
      sessions: [
        {
          dayOffset: 1,
          startTime: null,
          type: 'RUN',
          intensity: 'THRESHOLD',
          title: 'Seuil',
          description: 'Corps de séance seuil',
          durationMin: 45,
          load: 70,
          rationale: 'Progression',
        },
      ],
    } as never);

    vi.mocked(getOrBuildAthleteSnapshot).mockResolvedValue({
      snapshotId: 'snap-1',
      confidence: 0.8,
      decision: decisionState({ overallVerdict: 'RECOVER' }),
      physicalHealth: physicalHealthData(),
      fatigue: { trainingCapacity: 'FULL' },
      todaysDecision: 'RECOVER',
    } as never);

    const { POST } = await importRoute();
    const response = await POST(
      new Request('http://localhost/api/coach/plan', {
        method: 'POST',
        body: JSON.stringify({ days: 7 }),
      }),
    );
    const body = await consumeCoachProgressStream<PlanPayload, unknown>(response);

    expect(response.status).toBe(200);
    expect(body.gate.sessions).toHaveLength(1);
    expect(body.gate.sessions[0].status).toBe('REJECTED');
    expect(body.gate.sessions[0].findings.length).toBeGreaterThan(0);
    // Original proposal is preserved untouched in the response.
    expect(body.sessions[0].intensity).toBe('THRESHOLD');
    // A CoachingDecision is persisted even for a rejected proposal — the recommendation
    // was still shown to the athlete, and its id is exposed for the client to reference.
    expect(body.sessions[0].decisionId).toBe('mock-decision-id');
  });

  it('accepts a session when nothing in the context conflicts with it', async () => {
    const { runStructuredCoachStream } = await import('@/lib/coach/stream-structured-generation');
    const { getOrBuildAthleteSnapshot } = await import('@/lib/athlete-state/snapshot-service');

    vi.mocked(runStructuredCoachStream).mockResolvedValue({
      summary: 'Semaine calme',
      sessions: [
        {
          dayOffset: 1,
          startTime: null,
          type: 'RUN',
          intensity: 'ENDURANCE',
          title: 'Endurance facile',
          description: 'Footing',
          durationMin: 40,
          load: 35,
          rationale: 'Reprise progressive',
        },
      ],
    } as never);

    vi.mocked(getOrBuildAthleteSnapshot).mockResolvedValue({
      snapshotId: 'snap-2',
      confidence: 0.8,
      decision: decisionState(),
      physicalHealth: physicalHealthData(),
      fatigue: { trainingCapacity: 'FULL' },
      todaysDecision: 'TRAIN_SMART',
    } as never);

    const { POST } = await importRoute();
    const response = await POST(
      new Request('http://localhost/api/coach/plan', {
        method: 'POST',
        body: JSON.stringify({ days: 7 }),
      }),
    );
    const body = await consumeCoachProgressStream<PlanPayload, unknown>(response);

    expect(response.status).toBe(200);
    expect(body.gate.sessions[0].status).toBe('ACCEPTED');
  });

  it('carries an authored endurance structure through to the proposal', async () => {
    const { runStructuredCoachStream } = await import('@/lib/coach/stream-structured-generation');
    const { getOrBuildAthleteSnapshot } = await import('@/lib/athlete-state/snapshot-service');
    const { createCoachingDecision } = await import('@/lib/decision-memory/repository');

    vi.mocked(runStructuredCoachStream).mockResolvedValue({
      summary: 'Bloc seuil',
      sessions: [
        {
          dayOffset: 3,
          startTime: null,
          type: 'RUN',
          intensity: 'THRESHOLD',
          title: '6×1000 m',
          description: 'Séance seuil',
          durationMin: 60,
          load: 75,
          rationale: 'Développer le seuil',
          endurancePrescription: {
            blocks: [
              { steps: [{ kind: 'warmup', minutes: 20 }] },
              {
                times: 6,
                steps: [
                  { kind: 'interval', meters: 1000, effort: 'THRESHOLD' },
                  { kind: 'recovery', minutes: 2 },
                ],
              },
              { steps: [{ kind: 'cooldown', minutes: 10 }] },
            ],
          },
        },
      ],
    } as never);

    vi.mocked(getOrBuildAthleteSnapshot).mockResolvedValue({
      snapshotId: 'snap-4',
      confidence: 0.9,
      decision: decisionState(),
      physicalHealth: physicalHealthData(),
      fatigue: { trainingCapacity: 'FULL' },
      todaysDecision: 'TRAIN_SMART',
    } as never);

    const { POST } = await importRoute();
    const body = await consumeCoachProgressStream<PlanPayload, unknown>(
      await POST(
        new Request('http://localhost/api/coach/plan', {
          method: 'POST',
          body: JSON.stringify({ days: 7 }),
        }),
      ),
    );

    expect(body.sessions[0].endurancePrescription?.blocks).toHaveLength(3);
    const [[call]] = vi.mocked(createCoachingDecision).mock.calls;
    expect(call.proposal.endurancePrescription?.blocks?.[1]?.times).toBe(6);
  });

  it('persists a CoachingDecision with the exact proposal, gate result, and frozen snapshot context', async () => {
    const { runStructuredCoachStream } = await import('@/lib/coach/stream-structured-generation');
    const { getOrBuildAthleteSnapshot } = await import('@/lib/athlete-state/snapshot-service');
    const { createCoachingDecision } = await import('@/lib/decision-memory/repository');

    vi.mocked(runStructuredCoachStream).mockResolvedValue({
      summary: 'Bloc',
      sessions: [
        {
          dayOffset: 2,
          startTime: null,
          type: 'BIKE',
          intensity: 'ENDURANCE',
          title: 'Vélo',
          description: 'Sortie',
          durationMin: 90,
          load: 60,
          rationale: 'Volume',
        },
      ],
    } as never);

    vi.mocked(getOrBuildAthleteSnapshot).mockResolvedValue({
      snapshotId: 'snap-3',
      confidence: 0.9,
      decision: decisionState(),
      physicalHealth: physicalHealthData(),
      fatigue: { trainingCapacity: 'FULL' },
      todaysDecision: 'TRAIN_SMART',
    } as never);

    const { POST } = await importRoute();
    // The route answers with a stream: the Gate and the decision writes only run
    // once it is drained, so consume it before asserting on the side effects.
    await consumeCoachProgressStream(
      await POST(
        new Request('http://localhost/api/coach/plan', {
          method: 'POST',
          body: JSON.stringify({ days: 7 }),
        }),
      ),
    );

    expect(createCoachingDecision).toHaveBeenCalledTimes(1);
    const [[call]] = vi.mocked(createCoachingDecision).mock.calls;
    expect(call.source).toBe('PLAN_GENERATOR');
    expect(call.proposal.type).toBe('BIKE');
    expect(call.proposal.intensity).toBe('ENDURANCE');
    expect(call.snapshotIdAtRecommendation).toBe('snap-3');
    expect(call.snapshotContext.overallVerdict).toBe('TRAIN_SMART');
  });
});
