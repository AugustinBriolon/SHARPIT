import { describe, expect, it } from 'vitest';
import {
  buildWeeklyDeltaPresentation,
  corpsToneFromPhysicalSeverity,
  resolveMetricValueTone,
  resolveWeeklyDeltaStatus,
  toWeeklyDeltaMetricId,
} from '@/lib/health-status';

describe('health-status weekly delta', () => {
  it('maps composition metric ids with weekly delta support', () => {
    expect(toWeeklyDeltaMetricId('bodyFatPct')).toBe('bodyFatPct');
    expect(toWeeklyDeltaMetricId('vo2Max')).toBeNull();
  });

  it('flags weight gain above 0.3 kg as watch', () => {
    expect(resolveWeeklyDeltaStatus('weightKg', 0.5).tone).toBe('watch');
    expect(resolveWeeklyDeltaStatus('weightKg', 0.2).tone).toBe('ok');
  });

  it('flags strong weight gain as attention', () => {
    expect(resolveWeeklyDeltaStatus('weightKg', 0.9).tone).toBe('attention');
  });

  it('keeps weight loss neutral', () => {
    expect(resolveWeeklyDeltaStatus('weightKg', -0.5).tone).toBe('ok');
  });

  it('flags body fat increase as watch', () => {
    expect(resolveWeeklyDeltaStatus('bodyFatPct', 0.4).tone).toBe('watch');
  });

  it('keeps favorable body fat decrease neutral', () => {
    expect(resolveWeeklyDeltaStatus('bodyFatPct', -2.63).tone).toBe('ok');
  });

  it('flags muscle loss as watch', () => {
    expect(resolveWeeklyDeltaStatus('musclePct', -0.5).tone).toBe('watch');
  });

  it('flags implausible muscle spike as verify with measurement hint', () => {
    const status = resolveWeeklyDeltaStatus('musclePct', 17.53);
    expect(status.tone).toBe('verify');
    expect(status.measurementHint).toContain('vérifie posture');
  });

  it('elevates card value tone from zone and delta', () => {
    expect(resolveMetricValueTone('ok', 'musclePct', 17.53)).toBe('verify');
    expect(resolveMetricValueTone('ok', 'bodyFatPct', 0.5)).toBe('watch');
  });

  it('builds presentation fields for UI', () => {
    const presentation = buildWeeklyDeltaPresentation('weightKg', 0.87, (d) => `${d} kg vs 7j`);
    expect(presentation.deltaTone).toBe('attention');
    expect(presentation.deltaDisplay).toBe('0.87 kg vs 7j');
  });

  it('maps physical severity 0-10 with conservative thresholds', () => {
    expect(corpsToneFromPhysicalSeverity(2)).toBe('ok');
    expect(corpsToneFromPhysicalSeverity(3)).toBe('ok');
    expect(corpsToneFromPhysicalSeverity(4)).toBe('watch');
    expect(corpsToneFromPhysicalSeverity(7)).toBe('attention');
  });
});
