import { describe, expect, it } from 'vitest';
import { parseWithingsMeasureGroup, WITHINGS_MEASURE } from '@/lib/integrations/withings-measures';

describe('parseWithingsMeasureGroup', () => {
  it('parse Body Scan metrics including vascular age and nerve health', () => {
    const parsed = parseWithingsMeasureGroup({
      grpid: 42,
      date: 1_728_000_000,
      measures: [
        { type: WITHINGS_MEASURE.WEIGHT, value: 7550, unit: -2 },
        { type: WITHINGS_MEASURE.FAT_RATIO, value: 185, unit: -1 },
        { type: WITHINGS_MEASURE.VASCULAR_AGE, value: 42, unit: 0 },
        { type: WITHINGS_MEASURE.NERVE_HEALTH_FEET_MAX, value: 85, unit: 0 },
        { type: WITHINGS_MEASURE.SKIN_CONDUCTANCE, value: 72, unit: 0 },
        { type: WITHINGS_MEASURE.PULSE_WAVE_VELOCITY, value: 65, unit: -1 },
        { type: WITHINGS_MEASURE.BMR, value: 1850, unit: 0 },
      ],
    });

    expect(parsed.weightKg).toBe(75.5);
    expect(parsed.bodyFatPct).toBe(18.5);
    expect(parsed.vascularAgeYears).toBe(42);
    expect(parsed.nerveHealthScore).toBe(85);
    expect(parsed.skinConductance).toBe(72);
    expect(parsed.pulseWaveVelocity).toBe(6.5);
    expect(parsed.bmr).toBe(1850);
  });
});
