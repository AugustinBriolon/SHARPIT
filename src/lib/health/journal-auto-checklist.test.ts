import { describe, expect, it } from 'vitest';
import { DEFAULT_JOURNAL_THRESHOLDS } from './journal-prefs';
import {
  buildJournalAutoChecklist,
  sumCardioMinutes,
  sumStrengthMinutes,
} from './journal-auto-checklist';

describe('journal-auto-checklist', () => {
  it('sums cardio and strength minutes from activity durations in seconds', () => {
    expect(
      sumCardioMinutes([
        { type: 'RUN', duration: 1800 },
        { type: 'STRENGTH', duration: 2400 },
        { type: 'BIKE', duration: 600 },
      ]),
    ).toBe(40);
    expect(
      sumStrengthMinutes([
        { type: 'STRENGTH', duration: 1200 },
        { type: 'RUN', duration: 1800 },
      ]),
    ).toBe(20);
  });

  it('marks steps/stress/nap done or missed and outdoor unavailable', () => {
    const items = buildJournalAutoChecklist({
      health: {
        totalSteps: 12_000,
        stress: 28,
        napMinutes: 25,
        sleepMinutes: 450,
        bodyBattery: 62,
        waterMl: 2500,
      },
      activities: [
        { type: 'RUN', duration: 30 * 60 },
        { type: 'STRENGTH', duration: 25 * 60 },
      ],
      thresholds: DEFAULT_JOURNAL_THRESHOLDS,
      enabledIds: [
        'steps_10k',
        'stress_ok',
        'nap',
        'cardio_20',
        'strength_20',
        'sleep_target',
        'body_battery_ok',
        'hydration_sync',
        'outdoor_minutes',
      ],
    });
    expect(items.map((item) => [item.id, item.status])).toEqual([
      ['steps_10k', 'done'],
      ['stress_ok', 'done'],
      ['nap', 'done'],
      ['cardio_20', 'done'],
      ['strength_20', 'done'],
      ['sleep_target', 'done'],
      ['body_battery_ok', 'done'],
      ['hydration_sync', 'done'],
      ['outdoor_minutes', 'unavailable'],
    ]);
  });

  it('returns unavailable when health signals are missing', () => {
    const items = buildJournalAutoChecklist({
      health: null,
      activities: [],
      thresholds: DEFAULT_JOURNAL_THRESHOLDS,
      enabledIds: ['steps_10k', 'stress_ok', 'nap', 'cardio_20', 'sleep_target'],
    });
    expect(items.find((item) => item.id === 'steps_10k')?.status).toBe('unavailable');
    expect(items.find((item) => item.id === 'stress_ok')?.status).toBe('unavailable');
    expect(items.find((item) => item.id === 'nap')?.status).toBe('unavailable');
    expect(items.find((item) => item.id === 'sleep_target')?.status).toBe('unavailable');
    expect(items.find((item) => item.id === 'cardio_20')?.status).toBe('missed');
  });
});
