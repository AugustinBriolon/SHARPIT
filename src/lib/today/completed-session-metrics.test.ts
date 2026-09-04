import { describe, expect, it } from 'vitest';
import {
  buildCompletedSessionMetrics,
  type CompletedSessionMetricSource,
} from './completed-session-metrics';

function source(
  partial: Partial<CompletedSessionMetricSource> & Pick<CompletedSessionMetricSource, 'type'>,
): CompletedSessionMetricSource {
  return {
    duration: null,
    load: null,
    rpe: null,
    runMetrics: null,
    bikeMetrics: null,
    swimMetrics: null,
    hikeMetrics: null,
    strengthSets: [],
    ...partial,
  };
}

describe('buildCompletedSessionMetrics', () => {
  it('builds distance, duration, and pace for a run', () => {
    const metrics = buildCompletedSessionMetrics(
      source({
        type: 'RUN',
        duration: 1690,
        runMetrics: { distanceM: 5200 },
        load: 45,
      }),
    );

    expect(metrics).toEqual([
      { label: 'Distance', value: '5.20', unit: 'km' },
      { label: 'Durée', value: '28:10', unit: 'min' },
      { label: 'Allure', value: '5:25', unit: '/km' },
    ]);
  });

  it('uses meters for short distances', () => {
    const metrics = buildCompletedSessionMetrics(
      source({
        type: 'RUN',
        duration: 300,
        runMetrics: { distanceM: 800 },
      }),
    );

    expect(metrics[0]).toEqual({ label: 'Distance', value: '800', unit: 'm' });
  });

  it('builds bike duration, power, and TSS', () => {
    const metrics = buildCompletedSessionMetrics(
      source({
        type: 'BIKE',
        duration: 3600,
        bikeMetrics: { tss: 72.4, avgPower: 188 },
        load: 70,
      }),
    );

    expect(metrics).toEqual([
      { label: 'Durée', value: '1:00:00', unit: 'h' },
      { label: 'Puissance', value: '188', unit: 'W' },
      { label: 'Charge', value: '72', unit: 'TSS' },
    ]);
  });

  it('builds swim distance, duration, and pace per 100m', () => {
    const metrics = buildCompletedSessionMetrics(
      source({
        type: 'SWIM',
        duration: 1800,
        swimMetrics: { distanceM: 1500 },
      }),
    );

    expect(metrics).toEqual([
      { label: 'Distance', value: '1.50', unit: 'km' },
      { label: 'Durée', value: '30:00', unit: 'min' },
      { label: 'Allure', value: '2:00', unit: '/100m' },
    ]);
  });

  it('prefers hike pace then elevation when slots remain', () => {
    const metrics = buildCompletedSessionMetrics(
      source({
        type: 'HIKE',
        duration: 7200,
        hikeMetrics: { distanceM: 12_000, elevationM: 850 },
      }),
    );

    expect(metrics).toEqual([
      { label: 'Distance', value: '12.00', unit: 'km' },
      { label: 'Durée', value: '2:00:00', unit: 'h' },
      { label: 'Allure', value: '10:00', unit: '/km' },
    ]);
  });

  it('falls back to hike elevation when pace cannot be derived', () => {
    const metrics = buildCompletedSessionMetrics(
      source({
        type: 'HIKE',
        duration: 3600,
        hikeMetrics: { distanceM: null, elevationM: 420 },
      }),
    );

    expect(metrics).toEqual([
      { label: 'Durée', value: '1:00:00', unit: 'h' },
      { label: 'D+', value: '420', unit: 'm' },
    ]);
  });

  it('builds strength duration, RPE, and load before exercise count', () => {
    const metrics = buildCompletedSessionMetrics(
      source({
        type: 'STRENGTH',
        duration: 2700,
        rpe: 7,
        load: 35,
        strengthSets: [{ exercise: 'Squat' }, { exercise: 'Press' }, { exercise: 'Squat' }],
      }),
    );

    expect(metrics).toEqual([
      { label: 'Durée', value: '45:00', unit: 'min' },
      { label: 'RPE', value: '7', unit: '' },
      { label: 'Charge', value: '35', unit: 'TSS' },
    ]);
  });

  it('uses exercise count when strength has no load', () => {
    const metrics = buildCompletedSessionMetrics(
      source({
        type: 'STRENGTH',
        duration: 1800,
        rpe: 6,
        strengthSets: [{ exercise: 'Squat' }, { exercise: 'Press' }],
      }),
    );

    expect(metrics).toEqual([
      { label: 'Durée', value: '30:00', unit: 'min' },
      { label: 'RPE', value: '6', unit: '' },
      { label: 'Exercices', value: '2', unit: 'exos' },
    ]);
  });

  it('omits empty slots rather than inventing values', () => {
    const metrics = buildCompletedSessionMetrics(
      source({
        type: 'RUN',
        duration: 1200,
        runMetrics: { distanceM: null },
      }),
    );

    expect(metrics).toEqual([{ label: 'Durée', value: '20:00', unit: 'min' }]);
  });
});
