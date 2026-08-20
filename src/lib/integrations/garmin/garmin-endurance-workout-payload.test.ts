import { describe, expect, it } from 'vitest';
import { buildEnduranceWorkoutPayload } from '@/lib/integrations/garmin/garmin-endurance-workout-payload';
import type { EndurancePrescription } from '@/lib/planned-session/endurance/endurance-prescription';
import type { AthleteThresholds } from '@/lib/planned-session/endurance/endurance-targets';

const THRESHOLDS: AthleteThresholds = {
  runThresholdPaceSecPerKm: 240,
  ftpW: 250,
  lthr: 165,
  maxHr: 190,
};

/** 15 min warm-up · 5 × (800 m seuil / 2 min récup) · 10 min retour au calme. */
const INTERVAL_SESSION: EndurancePrescription = {
  version: 1,
  sport: 'RUN',
  blocks: [
    {
      kind: 'step',
      step: {
        kind: 'warmup',
        duration: { type: 'time', seconds: 900 },
        target: { metric: 'pace', pctMin: 40, pctMax: 82.5 },
      },
    },
    {
      kind: 'repeat',
      iterations: 5,
      steps: [
        {
          kind: 'interval',
          duration: { type: 'distance', meters: 800 },
          target: { metric: 'pace', pctMin: 97.5, pctMax: 102.5 },
        },
        {
          kind: 'recovery',
          duration: { type: 'time', seconds: 120 },
          target: { metric: 'none' },
        },
      ],
    },
    {
      kind: 'step',
      step: {
        kind: 'cooldown',
        duration: { type: 'time', seconds: 600 },
        target: { metric: 'none' },
      },
    },
  ],
};

type Step = Record<string, never> & Record<string, unknown>;

function segmentSteps(payload: Record<string, unknown>): Step[] {
  const segments = payload.workoutSegments as Array<{ workoutSteps: Step[] }>;
  return segments[0].workoutSteps;
}

describe('buildEnduranceWorkoutPayload', () => {
  it('wraps repeated steps in a repeat group sharing one childStepId', () => {
    const { payload } = buildEnduranceWorkoutPayload({
      workoutName: 'Seuil 5x800',
      prescription: INTERVAL_SESSION,
      thresholds: THRESHOLDS,
    });

    const steps = segmentSteps(payload);
    expect(steps).toHaveLength(3);

    const group = steps[1] as unknown as {
      type: string;
      numberOfIterations: number;
      childStepId: number;
      workoutSteps: Array<{ childStepId: number }>;
    };
    expect(group.type).toBe('RepeatGroupDTO');
    expect(group.numberOfIterations).toBe(5);
    expect(group.workoutSteps).toHaveLength(2);
    expect(group.workoutSteps.every((child) => child.childStepId === group.childStepId)).toBe(true);
  });

  it('sends a pace target as an ascending speed range in m/s', () => {
    const { payload } = buildEnduranceWorkoutPayload({
      workoutName: 'Seuil 5x800',
      prescription: INTERVAL_SESSION,
      thresholds: THRESHOLDS,
    });

    const group = segmentSteps(payload)[1] as unknown as { workoutSteps: Step[] };
    const interval = group.workoutSteps[0] as unknown as {
      targetType: { workoutTargetTypeKey: string };
      targetValueOne: number;
      targetValueTwo: number;
    };

    expect(interval.targetType.workoutTargetTypeKey).toBe('pace.zone');
    expect(interval.targetValueOne).toBeLessThan(interval.targetValueTwo);
    expect(interval.targetValueOne).toBeCloseTo(4.0625, 4);
    expect(interval.targetValueTwo).toBeCloseTo(4.2708, 4);
  });

  it('uses metres for a sub-kilometre interval and seconds for a timed step', () => {
    const { payload } = buildEnduranceWorkoutPayload({
      workoutName: 'Seuil 5x800',
      prescription: INTERVAL_SESSION,
      thresholds: THRESHOLDS,
    });

    const group = segmentSteps(payload)[1] as unknown as { workoutSteps: Step[] };
    const interval = group.workoutSteps[0] as unknown as {
      endCondition: { conditionTypeKey: string };
      endConditionValue: number;
      preferredEndConditionUnit: { unitKey: string };
    };
    expect(interval.endCondition.conditionTypeKey).toBe('distance');
    expect(interval.endConditionValue).toBe(800);
    expect(interval.preferredEndConditionUnit.unitKey).toBe('meter');

    const warmup = segmentSteps(payload)[0] as unknown as {
      endCondition: { conditionTypeKey: string };
      endConditionValue: number;
    };
    expect(warmup.endCondition.conditionTypeKey).toBe('time');
    expect(warmup.endConditionValue).toBe(900);
  });

  it('estimates duration and distance from timed and measured steps only', () => {
    const { payload, stepCount } = buildEnduranceWorkoutPayload({
      workoutName: 'Seuil 5x800',
      prescription: INTERVAL_SESSION,
      thresholds: THRESHOLDS,
    });

    // 900 warm-up + 5 × 120 recovery + 600 cooldown
    expect(payload.estimatedDurationInSecs).toBe(2100);
    expect(payload.estimatedDistanceInMeters).toBe(4000);
    // Repeat group expanded: 1 + 5 × 2 + 1
    expect(stepCount).toBe(12);
  });

  it('reports the athlete-facing preview of every step', () => {
    const { mapped } = buildEnduranceWorkoutPayload({
      workoutName: 'Seuil 5x800',
      prescription: INTERVAL_SESSION,
      thresholds: THRESHOLDS,
    });

    expect(mapped[1]).toEqual({
      kind: 'interval',
      durationLabel: '800 m',
      targetLabel: '3:54–4:06/km',
    });
    expect(mapped[0].durationLabel).toBe('15 min');
  });

  it('still sends the workout without guidance when a threshold is missing', () => {
    const { payload, warnings } = buildEnduranceWorkoutPayload({
      workoutName: 'Seuil 5x800',
      prescription: INTERVAL_SESSION,
      thresholds: { ...THRESHOLDS, runThresholdPaceSecPerKm: null },
    });

    const group = segmentSteps(payload)[1] as unknown as { workoutSteps: Step[] };
    const interval = group.workoutSteps[0] as unknown as {
      targetType: { workoutTargetTypeKey: string };
    };
    expect(interval.targetType.workoutTargetTypeKey).toBe('no.target');
    expect(warnings).toEqual(['Allure seuil inconnue — cible allure impossible.']);
  });

  it('maps the sport onto the Connect running type', () => {
    const { payload } = buildEnduranceWorkoutPayload({
      workoutName: 'Seuil 5x800',
      prescription: INTERVAL_SESSION,
      thresholds: THRESHOLDS,
    });
    expect(payload.sportType).toMatchObject({ sportTypeKey: 'running', sportTypeId: 1 });
  });
});

describe('buildEnduranceWorkoutPayload — swimming', () => {
  /** 400 m warm-up · 8 × (50 m / rest at the wall) — no pace band yet. */
  const POOL_SESSION: EndurancePrescription = {
    version: 1,
    sport: 'SWIM',
    poolLengthM: 25,
    blocks: [
      {
        kind: 'step',
        step: {
          kind: 'warmup',
          duration: { type: 'distance', meters: 400 },
          target: { metric: 'none' },
        },
      },
      {
        kind: 'repeat',
        iterations: 8,
        steps: [
          {
            kind: 'interval',
            duration: { type: 'distance', meters: 50 },
            target: { metric: 'none' },
          },
          { kind: 'rest', duration: { type: 'lap' }, target: { metric: 'none' } },
        ],
      },
    ],
  };

  it('declares the pool so Connect can render a pool workout', () => {
    const { payload } = buildEnduranceWorkoutPayload({
      workoutName: 'Piscine 8x50',
      prescription: POOL_SESSION,
      thresholds: THRESHOLDS,
    });

    expect(payload.sportType).toMatchObject({ sportTypeKey: 'swimming' });
    expect(payload.poolLength).toBe(25);
    expect(payload.poolLengthUnit).toMatchObject({ unitKey: 'meter' });
  });

  it('ends a wall rest on the Lap button rather than a countdown', () => {
    const { payload } = buildEnduranceWorkoutPayload({
      workoutName: 'Piscine 8x50',
      prescription: POOL_SESSION,
      thresholds: THRESHOLDS,
    });

    const group = segmentSteps(payload)[1] as unknown as { workoutSteps: Step[] };
    const rest = group.workoutSteps[1] as unknown as {
      endCondition: { conditionTypeKey: string };
      endConditionValue: number | null;
    };
    expect(rest.endCondition.conditionTypeKey).toBe('lap.button');
    expect(rest.endConditionValue).toBeNull();
  });

  it('counts distances in metres, as a pool set reads', () => {
    const { payload, stepCount } = buildEnduranceWorkoutPayload({
      workoutName: 'Piscine 8x50',
      prescription: POOL_SESSION,
      thresholds: THRESHOLDS,
    });

    const warmup = segmentSteps(payload)[0] as unknown as {
      endConditionValue: number;
      preferredEndConditionUnit: { unitKey: string };
    };
    expect(warmup.endConditionValue).toBe(400);
    expect(warmup.preferredEndConditionUnit.unitKey).toBe('meter');
    // 400 warm-up + 8 × 50
    expect(payload.estimatedDistanceInMeters).toBe(800);
    expect(stepCount).toBe(17);
  });
});
