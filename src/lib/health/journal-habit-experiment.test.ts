import { describe, expect, it } from 'vitest';
import {
  evaluateExperiment,
  experimentReviewDayId,
  type ExperimentEvidence,
  type ExperimentRecord,
} from '@/lib/health/journal-habit-experiment';
import { addTrainingDays } from '@/lib/training/training-day';

const START = '2026-09-01';

function record(overrides: Partial<ExperimentRecord> = {}): ExperimentRecord {
  return {
    id: 'exp-1',
    factorId: 'device_in_bed',
    intent: 'REMOVE',
    startDayId: START,
    cancelledAt: null,
    ...overrides,
  };
}

/** 21 baseline days at `baselineSleep`, then the window days held with `windowSleep`. */
function evidence(options: {
  heldDays: number;
  baselineSleep: number;
  windowSleep: number;
}): ExperimentEvidence {
  const factorsByDay = new Map<string, Record<string, 'yes' | 'no'>>();
  const sleep = new Map<string, number>();
  for (let offset = -21; offset < 0; offset += 1) {
    sleep.set(addTrainingDays(START, offset), options.baselineSleep);
  }
  for (let offset = 0; offset < 7; offset += 1) {
    const dayId = addTrainingDays(START, offset);
    if (offset < options.heldDays) {
      factorsByDay.set(dayId, { device_in_bed: 'no' });
      sleep.set(dayId, options.windowSleep);
    }
  }
  return {
    factorsByDay,
    outcomesByDay: { sleepMinutes: sleep, recoveryScore: new Map(), bodyBattery: new Map() },
  };
}

describe('journal habit experiments', () => {
  it('reviews once the last window day is measured — a day later for next-morning factors', () => {
    expect(experimentReviewDayId(record())).toBe('2026-09-08');
    expect(experimentReviewDayId(record({ factorId: 'alcohol' }))).toBe('2026-09-09');
  });

  it('tracks a running window day by day', () => {
    const today = addTrainingDays(START, 4);
    const result = evaluateExperiment(
      record(),
      evidence({ heldDays: 3, baselineSleep: 400, windowSleep: 450 }),
      today,
    );

    expect(result.status).toBe('running');
    expect(result.dayIndex).toBe(5);
    expect(result.segments).toEqual([
      'held',
      'held',
      'held',
      'missed',
      'pending',
      'pending',
      'pending',
    ]);
    expect(result.verdict).toBeNull();
  });

  it('says it worked when a gap clears the association threshold in the right direction', () => {
    const result = evaluateExperiment(
      record(),
      evidence({ heldDays: 7, baselineSleep: 400, windowSleep: 460 }),
      '2026-09-08',
    );

    expect(result.status).toBe('reviewed');
    expect(result.verdict).toBe('worked');
    expect(result.effects[0]).toMatchObject({
      outcome: 'sleepMinutes',
      delta: 60,
      nWindow: 7,
      nBaseline: 21,
    });
  });

  it('calls a gap under the threshold « sans effet », never inconclusive', () => {
    const result = evaluateExperiment(
      record(),
      evidence({ heldDays: 7, baselineSleep: 400, windowSleep: 410 }),
      '2026-09-08',
    );

    expect(result.verdict).toBe('no_effect');
  });

  it('abandons a window that was not kept or was stopped', () => {
    const notKept = evaluateExperiment(
      record(),
      evidence({ heldDays: 4, baselineSleep: 400, windowSleep: 460 }),
      '2026-09-08',
    );
    const stopped = evaluateExperiment(
      record({ cancelledAt: new Date('2026-09-03T08:00:00Z') }),
      evidence({ heldDays: 2, baselineSleep: 400, windowSleep: 460 }),
      '2026-09-03',
    );

    expect(notKept.verdict).toBe('abandoned');
    expect(stopped).toMatchObject({ status: 'reviewed', verdict: 'abandoned', effects: [] });
  });
});
