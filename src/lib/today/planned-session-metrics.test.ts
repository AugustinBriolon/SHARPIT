import { describe, expect, it } from 'vitest';
import { buildBrickSessionMetrics, buildPlannedSessionMetrics } from './planned-session-metrics';

describe('buildPlannedSessionMetrics', () => {
  it('builds intensity, duration, and load for a planned run', () => {
    expect(
      buildPlannedSessionMetrics({
        type: 'RUN',
        durationMin: 45,
        intensity: 'TEMPO',
        load: 55,
        goalTitle: 'Nice 70.3',
      }),
    ).toEqual([
      { label: 'Intensité', value: 'Tempo', unit: '' },
      { label: 'Durée', value: '45', unit: 'min' },
      { label: 'Charge', value: '55', unit: 'TSS' },
    ]);
  });

  it('falls back to goal when load is absent', () => {
    expect(
      buildPlannedSessionMetrics({
        type: 'BIKE',
        durationMin: 90,
        intensity: 'ENDURANCE',
        load: null,
        goalTitle: 'Nice 70.3',
      }),
    ).toEqual([
      { label: 'Intensité', value: 'Endurance', unit: '' },
      { label: 'Durée', value: '1:30', unit: 'h' },
      { label: 'Objectif', value: 'Nice 70.3', unit: '' },
    ]);
  });
});

describe('buildBrickSessionMetrics', () => {
  it('aggregates duration, leg count, and load', () => {
    expect(
      buildBrickSessionMetrics({
        legs: [
          { durationMin: 60, load: 40 },
          { durationMin: 30, load: 25 },
        ],
        goalTitle: 'Nice 70.3',
      }),
    ).toEqual([
      { label: 'Durée', value: '1:30', unit: 'h' },
      { label: 'Jambes', value: '2', unit: 'sports' },
      { label: 'Charge', value: '65', unit: 'TSS' },
    ]);
  });

  it('uses goal when brick has no load', () => {
    expect(
      buildBrickSessionMetrics({
        legs: [{ durationMin: 40, load: null }, { durationMin: 20 }],
        goalTitle: 'A1',
      }),
    ).toEqual([
      { label: 'Durée', value: '1:00', unit: 'h' },
      { label: 'Jambes', value: '2', unit: 'sports' },
      { label: 'Objectif', value: 'A1', unit: '' },
    ]);
  });
});
